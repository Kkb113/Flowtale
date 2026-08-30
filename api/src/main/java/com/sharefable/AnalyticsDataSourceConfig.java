package com.sharefable;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.boot.orm.jpa.hibernate.SpringImplicitNamingStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(
  entityManagerFactoryRef = "analyticsEntityManagerFactory",
  transactionManagerRef = "analyticsTransactionManager",
  basePackages = {
    "com.sharefable.analytics"
  }
)
public class AnalyticsDataSourceConfig {
  @Bean(name = "analyticsDatasourceProperties")
  @ConfigurationProperties("spring.datasource.analytics")
  public DataSourceProperties analyticsDataSourceProperties() {
    return new DataSourceProperties();
  }

  @Bean(name = "analyticsDatasource")
  @ConfigurationProperties("spring.datasource.analytics.configuration")
  public DataSource analyticsDataSource(@Qualifier("analyticsDatasourceProperties") DataSourceProperties props) {
    return props.initializeDataSourceBuilder().build();
  }


  @Bean(name = "analyticsEntityManagerFactory")
  public LocalContainerEntityManagerFactoryBean entityManagerFactory(
    EntityManagerFactoryBuilder builder,
    @Qualifier("analyticsDatasource") DataSource dataSource,
    @Value("${spring.datasource.analytics.hibernate.ddl-auto:none}") String ddlAuto,
    @Value("${spring.datasource.analytics.hibernate.dialect:org.hibernate.dialect.PostgreSQLDialect}") String dialect) {
    Map<String, String> jpaProps = new HashMap<>();
    jpaProps.put("hibernate.dialect", dialect);
    jpaProps.put("hibernate.jdbc.time_zone", "UTC");
    jpaProps.put("hibernate.hbm2ddl.auto", ddlAuto);
    jpaProps.put("hibernate.physical_naming_strategy", CamelCaseToUnderscoresNamingStrategy.class.getName());
    jpaProps.put("hibernate.implicit_naming_strategy", SpringImplicitNamingStrategy.class.getName());

    return builder
      .dataSource(dataSource)
      .packages("com.sharefable.analytics.entity")
      .properties(jpaProps)
      .persistenceUnit("db2").build();
  }

  @Bean(name = "analyticsTransactionManager")
  public PlatformTransactionManager analyticsTransactionManager(
    @Qualifier("analyticsEntityManagerFactory") EntityManagerFactory customerEntityManagerFactory) {
    return new JpaTransactionManager(customerEntityManagerFactory);
  }
}
