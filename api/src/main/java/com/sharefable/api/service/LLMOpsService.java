package com.sharefable.api.service;

import com.sharefable.api.common.LLMOpsStatus;
import com.sharefable.api.entity.LLMOps;
import com.sharefable.api.repo.LLMOpsRepo;
import com.sharefable.api.transport.req.ReqNewLLMRun;
import com.sharefable.api.transport.req.ReqUpdateLLMRun;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class LLMOpsService {
  private final LLMOpsRepo llmOpsRepo;

  public LLMOps newLLMRun(ReqNewLLMRun body, Long belongsToOrg) {
    LLMOps ops = LLMOps.builder()
      .orgId(belongsToOrg)
      .status(LLMOpsStatus.InProgress)
      .data(body.getData())
      .meta(body.getMeta())
      .threadId(body.getThreadId())
      .entityId(body.getEntityId() == null ? 0L : body.getEntityId())
      .build();

    return llmOpsRepo.save(ops);
  }

  public List<LLMOps> getRuns(String threadId, Long belongsToOrg) {
    return llmOpsRepo.findAllByOrgIdAndThreadIdAndStatusOrderByUpdatedAtDesc(
      belongsToOrg,
      threadId,
      LLMOpsStatus.Successful,
      PageRequest.of(0, 2)
    );
  }

  public LLMOps updateRun(ReqUpdateLLMRun body) {
    Optional<LLMOps> maybeOps = llmOpsRepo.findById(body.getId());
    if (maybeOps.isEmpty()) return null;

    LLMOps llmOps = maybeOps.get();
    if (body.getData() != null) llmOps.setData(body.getData());
    if (body.getMeta() != null) llmOps.setMeta(body.getMeta());
    if (body.getStatus() != null) llmOps.setStatus(body.getStatus());

    return llmOpsRepo.save(llmOps);
  }
}
