package com.sharefable.api.entity;

import com.sharefable.api.transport.JobProcessingInfo;
import com.sharefable.api.transport.JobProcessingStatus;
import com.sharefable.api.transport.JobType;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

@Entity
@Table(name = "jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
public class Job extends EntityBase {
    @Enumerated(value = EnumType.STRING)
    @Column(nullable = false)
    private JobType jobType;

    @Column(nullable = false)
    private String jobKey;

    @Enumerated(value = EnumType.ORDINAL)
    @Column(nullable = false)
    private JobProcessingStatus processingStatus;

    private String failureReason;

    @Type(JsonType.class)
    @Column(columnDefinition = "json")
    private JobProcessingInfo info;
}
