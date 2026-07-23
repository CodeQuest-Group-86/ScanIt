package com.scanit.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportCounterfeitRequest {
    /** Which seller they saw/bought it from, if known. Optional free text. */
    private String sellerName;
    /** Why they think it's counterfeit. Optional. */
    private String reason;
}
