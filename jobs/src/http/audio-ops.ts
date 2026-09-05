import {Express, Request, Response} from 'express';
import {ReqGenerateAudio, RespGenerateAudio} from './contract';
import {captureException} from '@sentry/node';
import {ApiResp, ReqDeductCredit, RespUploadUrl, ResponseStatus, SubscriptionCreditType} from '../api-contract';
import Handlebars from 'handlebars';
import OpenAI from 'openai';
import { req as api, ApiServiceError } from '../api';
import { readNarrationDocument } from './narration-document';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY as string,
});

interface AnnotationConfig extends Record<string, any> {
  displayText: string;
  refId: string;
} 
type AnnotationMap = Record<string, AnnotationConfig>;

function annotationsFromDocument(fileJson: Record<string, any>): AnnotationMap {
  const formattedData: AnnotationMap = {};
  for (const [screenId, anns] of Object.entries(fileJson.entities)) {
    for (const ann of Object.values((anns as any).annotations || {})) {
      formattedData[`${screenId}/${(ann as AnnotationConfig).refId}`] = ann as AnnotationConfig;
    }
  }
  return formattedData;
}

// TODO don't perform if quilly credit is not enough
export default function addHttpListeners(app: Express) {
  app.post('/v1/f/aud/gen', async (req: Request, res: Response) => {
    const body = req.body as ReqGenerateAudio;
    try {
      const document = await readNarrationDocument(body.indexUri, req.headers.authorization);
      const ann = annotationsFromDocument(document)[body.entityUri];
      if (!ann) throw new Error('Incorrect entity');
      if (!ann.displayText) throw new Error('Display text is not present');

      const displayText = ann.displayText;
      const gen = Handlebars.compile(displayText);
      const generatedText = gen(body.vars);

      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: body.voice,
        input: generatedText,
      });
      const contentType = 'audio/mpeg';
      const buffer = await mp3.arrayBuffer();
      const mediaBuffer = new Uint8Array(buffer);

      // get presigned url
      const presigned = await api<null, RespUploadUrl>(
        `/f/getuploadlink?te=${btoa(contentType)}`,
        'GET',
        null,
        req.headers.authorization as string,
      );

      const uploadedMediaSrc = presigned.cdnPath;
      const upload = await fetch(presigned.url, {
        method: 'PUT',
        body: mediaBuffer,
        headers: { 'Content-Type': contentType },
        signal: AbortSignal.timeout(120000),
      });
      if (!upload.ok) throw new Error(`Audio upload failed (HTTP ${upload.status})`);

      const charLen = displayText.length;
      const per1kChar = Math.ceil(charLen / 1000);
      await api<ReqDeductCredit, null>('/f/deductcredit', 'POST', {
        // https://sharefable.slack.com/archives/C04998WM23F/p1729171341630929?thread_ts=1729170927.545179&cid=C04998WM23F
        deductBy: Math.ceil(per1kChar * 0.5),
        creditType: SubscriptionCreditType.AI_CREDIT,
      },
      req.headers.authorization as string);

      return res.status(200).send({
        status: ResponseStatus.Success,
        data: {
          url: uploadedMediaSrc,
          mediaType: 'audio/mpeg',
        },
      } as ApiResp<RespGenerateAudio>);
    } catch(e) {
      req.log.error('Narration generation failed');
      if (!(e instanceof ApiServiceError)) captureException(new Error('Narration generation failed'));
      return res.status(e instanceof ApiServiceError ? e.status : 500).json({
        status: ResponseStatus.Failure,
        errStr: 'Can\'t generate audio',
      } as ApiResp<any>);
    }
  });
}
