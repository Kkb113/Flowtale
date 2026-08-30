package com.sharefable.api.repo;

import com.sharefable.api.entity.Settings;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AppSettingsRepo extends CrudRepository<Settings, Long> {
}
