package com.example.firewatchreportingapp.api.models;

public class ReportListItem {
    private String reportId;
    private String title;
    private String severity;
    private String status;
    private String createdAt;
    private String imageUrl;
    private double lat;
    private double lng;

    public String getReportId() {
        return reportId;
    }

    public String getTitle() {
        return title;
    }

    public String getSeverity() {
        return severity;
    }

    public String getStatus() {
        return status;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public double getLat() {
        return lat;
    }

    public double getLng() {
        return lng;
    }
}
