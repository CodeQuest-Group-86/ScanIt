package com.scanit.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scanit.backend.dto.auth.SignInRequest;
import com.scanit.backend.dto.auth.SignUpRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper mapper;

    /**
     * Sign-up now requires a signupToken minted by a completed OTP verification (Resend
     * email OTP) rather than a bare role field — this drives the real flow (send → verify)
     * so the devCode surfaced in dev/test mode (no RESEND_API_KEY) stands in for the email.
     */
    private String obtainSignupToken(String email) throws Exception {
        String sendBody = mockMvc.perform(post("/auth/otp/send")
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("contact", email, "purpose", "signup"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String devCode = mapper.readTree(sendBody).path("data").path("devCode").asText();

        String verifyBody = mockMvc.perform(post("/auth/otp/verify")
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("contact", email, "code", devCode, "purpose", "signup"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return mapper.readTree(verifyBody).path("data").path("signupToken").asText();
    }

    private SignUpRequest signUpRequest(String email) throws Exception {
        SignUpRequest req = new SignUpRequest();
        req.setName("Test User");
        req.setEmail(email);
        req.setPassword("password123");
        req.setSignupToken(obtainSignupToken(email));
        return req;
    }

    @Test
    void signUp_createsAccountAndReturnsToken() throws Exception {
        mockMvc.perform(post("/auth/sign-up")
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(signUpRequest("newuser@scanit-test.com"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.email").value("newuser@scanit-test.com"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test
    void signUp_duplicateEmail_returnsBadRequest() throws Exception {
        SignUpRequest req = signUpRequest("duplicate@scanit-test.com");
        mockMvc.perform(post("/auth/sign-up")
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/auth/sign-up")
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void signIn_correctCredentials_returnsToken() throws Exception {
        mockMvc.perform(post("/auth/sign-up")
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(signUpRequest("signin-ok@scanit-test.com"))))
                .andExpect(status().isCreated());

        SignInRequest signIn = new SignInRequest();
        signIn.setEmail("signin-ok@scanit-test.com");
        signIn.setPassword("password123");

        mockMvc.perform(post("/auth/sign-in")
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(signIn)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test
    void signIn_wrongPassword_returnsUnauthorized() throws Exception {
        mockMvc.perform(post("/auth/sign-up")
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(signUpRequest("signin-badpw@scanit-test.com"))))
                .andExpect(status().isCreated());

        SignInRequest signIn = new SignInRequest();
        signIn.setEmail("signin-badpw@scanit-test.com");
        signIn.setPassword("wrong-password");

        mockMvc.perform(post("/auth/sign-in")
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(signIn)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    /**
     * Regression test — UserDetailsServiceImpl throws UsernameNotFoundException for an
     * email that was never registered, which used to fall through to the generic
     * exception handler and return 500 instead of a clean 401.
     */
    @Test
    void signIn_unknownEmail_returnsUnauthorizedNotServerError() throws Exception {
        SignInRequest signIn = new SignInRequest();
        signIn.setEmail("never-registered@scanit-test.com");
        signIn.setPassword("whatever123");

        mockMvc.perform(post("/auth/sign-in")
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(signIn)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }
}
