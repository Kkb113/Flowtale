package com.sharefable.api.repo;

import com.sharefable.api.common.LLMOpsStatus;
import com.sharefable.api.entity.LLMOps;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LLMOpsRepo extends JpaRepository<LLMOps, Long> {
  List<LLMOps> findAllByOrgIdAndThreadIdAndStatusOrderByUpdatedAtDesc(
    Long orgId,
    String threadId,
    LLMOpsStatus status,
    PageRequest pageRequest
  );
}
