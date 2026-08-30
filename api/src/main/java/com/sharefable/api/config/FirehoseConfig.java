package com.sharefable.api.config;

import com.amazonaws.services.kinesisfirehose.AmazonKinesisFirehoseClient;
import com.amazonaws.services.kinesisfirehose.AmazonKinesisFirehoseClientBuilder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "com.sharefable.api.firehose")
@NoArgsConstructor
@AllArgsConstructor
@Data
@Slf4j
public class FirehoseConfig {
    private String streamPrefix;
    private String region;

    @Bean
    public AmazonKinesisFirehoseClient FirehoseClient() {
        return (AmazonKinesisFirehoseClient) AmazonKinesisFirehoseClientBuilder.standard().withRegion(region).build();
    }
}
