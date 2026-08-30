package com.sharefable.api.config;

import com.amazonaws.client.builder.AwsClientBuilder;
import com.amazonaws.services.sqs.AmazonSQS;
import com.amazonaws.services.sqs.AmazonSQSClientBuilder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "com.sharefable.api.q")
@NoArgsConstructor
@AllArgsConstructor
@Data
@Slf4j
public class SQSConfig {
    private String name;

    private String region;

    private String qUrl;

    private String endpoint;

    @Bean
    AmazonSQS sqsClient() {
        AmazonSQSClientBuilder builder = AmazonSQSClientBuilder.standard();
        AmazonSQS client = StringUtils.isBlank(endpoint)
            ? builder.withRegion(region).build()
            : builder.withEndpointConfiguration(new AwsClientBuilder.EndpointConfiguration(endpoint, region)).build();
        qUrl = client.getQueueUrl(name).getQueueUrl();
        return client;
    }
}
