package com.sharefable;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.boot.orm.jpa.hibernate.SpringImplicitNamingStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
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
  entityManagerFactoryRef = "apiEntityManagerFactory",
  transactionManagerRef = "apiTransactionManager",
  basePackages = {
    "com.sharefable.api"
  }
)
public class ApiDataSourceConfig {
  @Primary
  @Bean(name = "apiDatasourceProperties")
  @ConfigurationProperties("spring.datasource.api")
  public DataSourceProperties apiDataSourceProperties() {
    return new DataSourceProperties();
  }

  @Primary
  @Bean(name = "apiDatasource")
  @ConfigurationProperties(prefix = "spring.datasource.api.configuration")
  public DataSource apiDataSource(@Qualifier("apiDatasourceProperties") DataSourceProperties props) {
    return props.initializeDataSourceBuilder().build();
  }

  @Primary
  @Bean(name = "apiEntityManagerFactory")
  public LocalContainerEntityManagerFactoryBean entityManagerFactory(
    EntityManagerFactoryBuilder builder,
    @Qualifier("apiDatasource") DataSource dataSource) {
    Map<String, String> jpaProps = new HashMap<>();
    jpaProps.put("hibernate.dialect", "org.hibernate.dialect.MySQL8Dialect");
    jpaProps.put("hibernate.dialect.storage_engine", "innodb");
    jpaProps.put("hibernate.jdbc.time_zone", "UTC");
    jpaProps.put("hibernate.event.merge.entity_copy_observer", "allow");
    jpaProps.put("hibernate.ddl-auto", "none");
    jpaProps.put("hibernate.physical_naming_strategy", CamelCaseToUnderscoresNamingStrategy.class.getName());
    jpaProps.put("hibernate.implicit_naming_strategy", SpringImplicitNamingStrategy.class.getName());

    return builder
      .dataSource(dataSource)
      .packages("com.sharefable.api.entity")
      .properties(jpaProps)
      .persistenceUnit("db1").build();
  }

  @Primary
  @Bean(name = "apiTransactionManager")
  public PlatformTransactionManager apiTransactionManager(
    @Qualifier("apiEntityManagerFactory") EntityManagerFactory customerEntityManagerFactory) {
    return new JpaTransactionManager(customerEntityManagerFactory);
  }
}
