package com.sharefable.api.common;

public enum VanityDomainDeploymentStatus {
  Requested, // for already requested custom domains
  ManualInterventionNeeded, // for any deployment failure from aws end
  InProgress,
  VerificationPending,
  DeploymentPending,
  Issued,
  Failed
}
