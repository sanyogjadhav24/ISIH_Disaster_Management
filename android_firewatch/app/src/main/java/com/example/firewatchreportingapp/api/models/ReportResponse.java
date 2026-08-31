package com.example.firewatchreportingapp.api.models;

import java.util.List;

public class ReportResponse {
    private String reportId;
    private String status;
    private AiResult aiResult;
    private String title;
    private String description;
    private String severity;
    private String deviceName;
    private String deviceTime;
    private String imageUrl;
    private String createdAt;
    private double lat;
    private double lng;

    public String getReportId() {
        return reportId;
    }

    public String getStatus() {
        return status;
    }

    public AiResult getAiResult() {
        return aiResult;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getSeverity() {
        return severity;
    }

    public String getDeviceName() {
        return deviceName;
    }

    public String getDeviceTime() {
        return deviceTime;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public double getLat() {
        return lat;
    }

    public double getLng() {
        return lng;
    }

    public static class AiResult {
        private boolean isFire;
        private double fireConfidence;
        private boolean suspectedAIGenerated;
        private double aiGenConfidence;
        private List<String> reasons;

        public boolean isFire() {
            return isFire;
        }

        public double getFireConfidence() {
            return fireConfidence;
        }

        public boolean isSuspectedAIGenerated() {
            return suspectedAIGenerated;
        }

        public double getAiGenConfidence() {
            return aiGenConfidence;
        }

        public List<String> getReasons() {
            return reasons;
        }
    }
}
