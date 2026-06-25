package com.scanit.backend.exception;

public class InvalidObjectException extends RuntimeException {
    public InvalidObjectException(String message) {
        super(message);
    }
}
