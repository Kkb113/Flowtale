package com.sharefable.api.repo;

import com.sharefable.api.entity.WorkspaceInvitation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface WorkspaceInvitationRepo extends CrudRepository<WorkspaceInvitation, String> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT i FROM WorkspaceInvitation i WHERE i.tokenHash = :hash")
  Optional<WorkspaceInvitation> findForAcceptance(@Param("hash") String hash);
}
