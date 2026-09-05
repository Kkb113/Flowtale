package com.sharefable.api.common;

/** A compiler-authored recovery message, safe to return to the author. */
public final class PublicationValidationException extends RuntimeException {
  public PublicationValidationException(String message) { super(message); }
}
