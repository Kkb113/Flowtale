package com.sharefable.analytics.repo;

import com.sharefable.analytics.entity.ActivityDt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ActivityDtRepo extends JpaRepository<ActivityDt, Long> {

}
