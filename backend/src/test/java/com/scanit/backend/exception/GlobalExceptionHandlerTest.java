package com.scanit.backend.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void resourceNotFound_mapsTo404() {
        ResponseEntity<?> res = handler.handleNotFound(new ResourceNotFoundException("missing"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void badRequest_mapsTo400() {
        ResponseEntity<?> res = handler.handleBadRequest(new BadRequestException("bad"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void invalidObject_mapsTo422() {
        ResponseEntity<?> res = handler.handleInvalidObject(new InvalidObjectException("invalid"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void scanQuotaExceeded_mapsTo429() {
        ResponseEntity<?> res = handler.handleScanQuota(new ScanQuotaExceededException("quota"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    void badCredentials_mapsTo401WithGenericMessage() {
        ResponseEntity<com.scanit.backend.dto.ApiResponse<Void>> res =
                handler.handleBadCredentials(new BadCredentialsException("wrong password"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(res.getBody().getMessage()).isEqualTo("Invalid email or password");
    }

    /** Regression: an unknown email throws UsernameNotFoundException, which used to fall
     *  through to the generic 500 handler before this AuthenticationException catch-all. */
    @Test
    void usernameNotFound_mapsTo401NotServerError() {
        ResponseEntity<com.scanit.backend.dto.ApiResponse<Void>> res =
                handler.handleAuthentication(new UsernameNotFoundException("no such user"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(res.getBody().getMessage()).isEqualTo("Invalid email or password");
    }
}
