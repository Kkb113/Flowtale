import {Express, Request, Response} from 'express';
import { LLMResp, LLMOpsBase, RouterForTypeOfDemoCreation, CreateNewDemoV1, ThemeForGuideV1, RefForMMV, PostProcessDemoV1, DemoMetadata, UpdateDemoContentV1, RootRouterReq } from './contract';
import { clients } from './anthropic';
import { req as api } from '../../api';
import { ApiResp, ErrorCode, LLMOps, LLMOpsStatus, ReqDeductCredit, ReqNewLLMRun, ReqUpdateLLMRun, ResponseStatus, SubscriptionCreditType } from 'api-contract';
import {ImageBlockParam, MessageParam, TextBlockParam, Usage} from '@anthropic-ai/sdk/resources';
import PROMPTS, {PromptDetails, normalizeWhitespace} from './prompts';
import {APIError} from '@anthropic-ai/sdk';
import { PrivateAssetError, readPrivateImages } from './private-assets';
import { captureException } from '@sentry/node';
import hash from 'string-hash';
import { LogFn } from 'pino';
import {PromptCachingBetaTextBlockParam} from '@anthropic-ai/sdk/resources/beta/prompt-caching/messages';



interface LLMOpsData {
  ip: LLMOpsBase;
  systemPrompt: any;
  noOfPrevMsgsAddedInThread: number;
  messages: MessageParam[];
  err?: any;
  opMeta: any;
}


async function getImgsForPrompt(req: Request, refsForMMV: RefForMMV[]) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  req.once('aborted', abort);
  if (req.aborted) abort();
  let images;
  try {
    images = await readPrivateImages(req.house.iam.orgId, refsForMMV, controller.signal);
  } finally {
    req.removeListener('aborted', abort);
  }
  const msgs: MessageParam['content'] = images.flatMap(img => [{
    type: 'text',
    text: `screenId: ${img.id}${img.moreInfo ? `\n\n${img.moreInfo}` : ''}`,
  }, {
    type: 'image',
    source: {
      type: 'base64',
      media_type: img.type ?? 'image/png',
      data: img.data,
    },
  }]) as (TextBlockParam | ImageBlockParam)[];


  // fs.writeFileSync('op.json', JSON.stringify(msgs, null, 2), 'utf8');

  const msgsReducted: any = refsForMMV.flatMap(img => [{
    type: 'text',
    text: `screenId: ${img.id}`,
  }, {
    type: 'image',
    __type: 'image-reducted',
    source: {
      type: 'base64',
      media_type: 'image/png',
      data: ['reducted'],

    },
  }]);

  return {
    msgs,
    msgsReducted,
  };
}

async function callWithRetry(
  prompt: PromptDetails,
  threadId: string,
  messages: MessageParam[],
  options: {
    shouldCacheSystemPrompt?: boolean
  },
  errFn: LogFn, 
  execStack: any[] = [],
  retryCount = 0) {
  const hashNo = hash(threadId);
  // When retry happens check the next client immediately
  const clientId = (hashNo + retryCount) % clients.length;
  const client = clients[clientId];
  execStack.push({
    clientId,
    attempt: retryCount + 1,
  });

  const systemPrompt: PromptCachingBetaTextBlockParam = {text: prompt.system, type: 'text'};
  if (options.shouldCacheSystemPrompt) systemPrompt.cache_control = { type: 'ephemeral' };
  try {
    const msg = await client.beta.promptCaching.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4096,
      tools: prompt.fns,
      system:  [systemPrompt],
      stream: false,
      temperature: 0.5,
      tool_choice: {
        type: 'any',
      },
      messages,
    });
    return { msg, meta: execStack };
  } catch (e) {
    errFn('AI provider attempt failed');
    execStack.at(-1).err = 'Provider request failed';
    if (retryCount) {
      (e as any).execStack = execStack;
      throw e;
    }
    return callWithRetry(prompt, threadId, messages, options, errFn, execStack, retryCount + 1);
  }
}

async function callLLM(req: Request, threadId: string, prompt: PromptDetails, options: {
  shouldCacheSystemPrompt?: boolean,
  // This is saved in db, when base64 data is sent to llm, we don't store that in db, we store the file location instead
  userMsgRawReducted?: any;
  creditUsed: number;
  userMsgRaw: MessageParam['content']
}): Promise<LLMResp> {
  const body = req.body as LLMOpsBase;

  const opsData = {} as LLMOpsData;
  opsData.ip = body;
  opsData.systemPrompt = prompt;
  opsData.messages = [];
  const run = await api<ReqNewLLMRun, LLMOps>('/f/llmrun', 'POST', {
    threadId: body.thread,
    entityId: body.entityId,
    data: opsData,
    meta: {},
  }, req.headers.authorization as string);


  let existingThreadMsgs: MessageParam[] = [];
  let noOfPrevMsgsAddedInThread = 0;
  if (PROMPTS.RouterNewDemo.shouldAppendThreadMsgs) {
    const existingRuns = await api<null, LLMOps[]>(
      `/f/llmruns/${encodeURIComponent(body.thread)}`,
      'GET',
      null,
      req.headers.authorization as string,
    );
    existingThreadMsgs = existingRuns
      .filter(existingRun => existingRun.status === LLMOpsStatus.Successful)
      .flatMap(existingRun => (existingRun.data as LLMOpsData).messages);
    noOfPrevMsgsAddedInThread = existingThreadMsgs.length;
  }

  const msgLog: MessageParam[] = [];
  const userMessage: MessageParam = {
    role: 'user',
    content: options.userMsgRaw,
  };
  msgLog.push({
    role: 'user',
    content: options.userMsgRawReducted || options.userMsgRaw,
  });

  const llmResp: LLMResp = {
    err: null,
    data: null,
  };
  const outputMeta = { } as {
    usage: Usage;
    stopReason: string | null;
    dtInSec: number;
    exec: any;
  };

  try {
    const t1 = +new Date();
    const { msg, meta } = await callWithRetry(
      prompt,
      threadId,
      [
        ...existingThreadMsgs,
        userMessage,
      ],
      {
        shouldCacheSystemPrompt: options.shouldCacheSystemPrompt,
      },
      req.log.error.bind(req.log),
    );

    llmResp.data = {
      role: msg.role,
      content: msg.content,
    };
    msgLog.push(llmResp.data);
    outputMeta.usage = msg.usage;
    outputMeta.stopReason = msg.stop_reason;
    outputMeta.exec = meta;
    outputMeta.dtInSec = Math.ceil((+new Date() - t1) / 1000);
  } catch (e) {
    llmResp.err = {
      status: e instanceof APIError && e.status === 429 ? 429 : 502,
      name: 'AI generation failed. Your capture is retained; retry or continue manually.',
    };
    req.log.error('AI provider request failed');
    outputMeta.exec = (e as any).execStack;

  }

  await api<ReqUpdateLLMRun, LLMOps>('/f/updatellmrun', 'POST', {
    id: run.id,
    status: llmResp.err ? LLMOpsStatus.Failure : LLMOpsStatus.Successful,
    data: {
      ...run.data,
      noOfPrevMsgsAddedInThread,
      messages: msgLog,
      err: llmResp.err,
    },
    meta: outputMeta,
  },
  req.headers.authorization as string);

  if (options.creditUsed > 0 && !llmResp.err) {
    await api<ReqDeductCredit, null>('/f/deductcredit', 'POST', {
      deductBy: options.creditUsed,
      creditType: SubscriptionCreditType.AI_CREDIT,
    },
    req.headers.authorization as string);
  }

  return llmResp;
}

async function createDemoRouter(req: Request) {
  const body = req.body as RouterForTypeOfDemoCreation;
  return callLLM(
    req,
    body.thread,
    PROMPTS.RouterNewDemo,
    {
      creditUsed: 1,
      userMsgRaw: `
        <product-details>
          ${body.user_payload.product_details}
        </product_details>

        <demo-objective>
          ${body.user_payload.demo_objective}
        </demo-objective>
      `,
    },
  );
}

async function createDemoPerUsecase(req: Request) {
  const body = req.body as CreateNewDemoV1;
  let prompt: PromptDetails;
  let reqTag: 'product-enablement' | 'user-intent' = 'product-enablement';
  if (body.user_payload.usecase === 'marketing') {
    prompt = PROMPTS.CreateDemoMarketing;
  } else if (body.user_payload.usecase === 'step-by-step-guide')  {
    prompt = PROMPTS.CreateDemoStepByStep;
    reqTag = 'user-intent';
  } else if (body.user_payload.usecase === 'product')  {
    prompt = PROMPTS.CreateDemoStepByStep;
    reqTag = 'user-intent';
  }
  else prompt = PROMPTS.CreateDemoMarketing;

  const { msgs, msgsReducted } = await getImgsForPrompt(req, body.user_payload.refsForMMV);

  msgs.push({
    type: 'text',
    text: normalizeWhitespace(`
      <product-details>
        ${body.user_payload.product_details}
      </product-details>

      <demo-objective>
        ${body.user_payload.demo_objective}
      </demo-objective>

      <${reqTag}>
        ${body.user_payload.req}
      </${reqTag}

      ${body.user_payload.demoState && (`
        <demo-state>
          ${body.user_payload.demoState}
        </demo-state>
      `)}
    `),
  });
  msgsReducted.push(msgs.at(-1));

  return callLLM(
    req,
    body.thread,
    prompt,
    {
      shouldCacheSystemPrompt: body.user_payload.totalBatch > 1,
      userMsgRawReducted: msgsReducted,
      userMsgRaw: msgs,
      creditUsed: body.user_payload.refsForMMV.length,
    },
  );
}

async function suggestTheme(req: Request)  {
  const body = req.body as ThemeForGuideV1;
  const prompt: PromptDetails = PROMPTS.SuggestGuideTheme;

  const { msgs, msgsReducted } = await getImgsForPrompt(req, body.user_payload.refsForMMV);

  msgs.push({
    type: 'text',
    text: normalizeWhitespace(`
      <theme-objective>
        ${body.user_payload.theme_objective}
      </theme-objective>

      ${body.user_payload.exisiting_palette && normalizeWhitespace(`
        <exisiting-palette>
          ${body.user_payload.exisiting_palette}
        </exisiting-palette>
      `)}
    `),
  });
  msgsReducted.push(msgs.at(-1));

  return callLLM(
    req,
    body.thread,
    prompt,
    {
      userMsgRawReducted: msgsReducted,
      userMsgRaw: msgs,
      creditUsed: 1,
    },
  );
}

async function demoMetadata(req: Request) {
  const body = req.body as DemoMetadata;
  const { msgs, msgsReducted } = await getImgsForPrompt(req, body.user_payload.refsForMMV);

  let requirement = '';
  if (body.user_payload.metReq === 'user_intent') {
    requirement = 'Figure out the user intent from the screens. Do not clean up the screens';
  } else {
    requirement = 'Figure out what the product enables. Clean up the screens if possible.';
  }
  msgs.push({
    type: 'text',
    text: normalizeWhitespace(`
      <product-details>
        ${body.user_payload.product_details}
      </product-details>

      <demo-objective>
        ${body.user_payload.demo_objective}
      </demo-objective>

      <info-retrieval>
        ${requirement}
      </info-retrieval>
    `),
  });
  msgsReducted.push(msgs.at(-1));

  return callLLM(
    req,
    body.thread,
    PROMPTS.DemoMetadata,
    {
      userMsgRawReducted: msgsReducted,
      userMsgRaw: msgs,
      creditUsed: Math.ceil(body.user_payload.refsForMMV.length * 0.2),
    },
  );
}

async function postProcess(req: Request) {
  const body = req.body as PostProcessDemoV1;
  return callLLM(
    req,
    body.thread,
    PROMPTS.PostProcessDemo,
    {
      creditUsed: 1,
      userMsgRaw: `
        <product-details>
          ${body.user_payload.product_details}
        </product_details>

        <demo-objective>
          ${body.user_payload.demo_objective}
        </demo-objective>

        <module-recommendations>
          ${body.user_payload.module_recommendations}
        </module-recommendations>

        <demo-state>
          ${body.user_payload.demo_state}
        </demo-state>
      `,
    },
  );
}

async function updateDemoContent(req: Request) {
  const body = req.body as UpdateDemoContentV1;
  const creditUsed = body.user_payload.change_type === 'single-annotation' ? 
    1 : Math.ceil(JSON.parse(body.user_payload.demo_state).length/2);
  return callLLM(
    req,
    body.thread,
    PROMPTS.UpdateDemoContent,
    {
      creditUsed,
      userMsgRaw: `
        <product-details>
          ${body.user_payload.product_details}
        </product_details>

        <change-requested>
          ${body.user_payload.change_requested}
        </change-requested>

        <demo-state>
         ${body.user_payload.demo_state}
        </demo-state>
      `,
    },
  );
}

async function rootRouter(req: Request) {
  const body = req.body as RootRouterReq;

  return callLLM(
    req,
    body.thread,
    PROMPTS.RootRouter,
    {
      creditUsed: 1,
      userMsgRaw: `
        <product-details>
          ${body.user_payload.product_details}
        </product_details>

        <change-requested>
          ${body.user_payload.change_requested}
        </change-requested>
      `,
    },
  );
}

export default function addLlmOpsHttpListeners(app: Express) {
  app.post('/v1/f/llmops', async (req: Request, res: Response) => {
    const body = req.body as LLMOpsBase;

    let llmResp: LLMResp;
    try {
      if (body.type === 'create_demo_router') llmResp = await createDemoRouter(req);
      else if (body.type === 'create_demo_per_usecase') llmResp = await createDemoPerUsecase(req);
      else if (body.type === 'theme_suggestion_for_guides') llmResp = await suggestTheme(req);
      else if (body.type === 'post_process_demo') llmResp = await postProcess(req);
      else if (body.type === 'demo_metadata') llmResp = await demoMetadata(req);
      else if(body.type === 'update_demo_content') llmResp = await updateDemoContent(req);
      else if(body.type === 'root_router_req') llmResp = await rootRouter(req);
      else
        return res.status(404).json({
          status: ResponseStatus.Failure,
          data: null,
          errStr: 'Handler not found',
          errCode: ErrorCode.NotFound,
        } as ApiResp<null>);
    } catch (e) {
      if (e instanceof PrivateAssetError) {
        return res.status(e.statusCode).json({ status: ResponseStatus.Failure, data: null, errStr: e.message });
      }
      req.log.error('AI handler failed');
      captureException(new Error('AI handler failed'));
      return res.status(500).json({
        status: ResponseStatus.Failure,
        data: null,
        errStr: 'Error from handler',
      } as ApiResp<null>);
    }

    if (llmResp.err) {
      captureException(new Error('AI provider request failed'));
      return res.status(llmResp.err.status || 500).json({
        status: ResponseStatus.Failure,
        data: llmResp,
        errStr: llmResp.err.name,
      } as ApiResp<LLMResp>);
    } else {
      return res.status(200).json({
        status: ResponseStatus.Success,
        data: llmResp,
      } as ApiResp<LLMResp>);
    }
  });
}
