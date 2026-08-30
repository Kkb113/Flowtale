package com.sharefable.analytics.repo;

import com.sharefable.analytics.entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityRepo extends JpaRepository<Activity, Long> {
  List<Activity> getActivitiesByAidAndEncEntityIdOrderByUpdatedAtDesc(String aid, Long entityId);
}
