package com.example.firewatchreportingapp;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.bumptech.glide.Glide;
import com.example.firewatchreportingapp.api.ApiService;
import com.example.firewatchreportingapp.api.RetrofitClient;
import com.example.firewatchreportingapp.api.models.ReportResponse;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ReportDetailsActivity extends AppCompatActivity {

    private static final String TAG = "ReportDetailsActivity";
    private TextView tvStatus, tvMessage, tvLocation, tvDeviceName;
    private ImageView ivReportImage;
    private Button btnOpenMap;
    private ProgressBar progressBar;
    private String reportId;
    private double lat, lng;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_report_details);

        tvStatus = findViewById(R.id.tvStatus);
        tvMessage = findViewById(R.id.tvMessage);
        tvLocation = findViewById(R.id.tvLocation);
        tvDeviceName = findViewById(R.id.tvDeviceName);
        ivReportImage = findViewById(R.id.ivReportImage);
        btnOpenMap = findViewById(R.id.btnOpenMap);
        progressBar = findViewById(R.id.progressBar);

        reportId = getIntent().getStringExtra("reportId");
        if (reportId == null) {
            Toast.makeText(this, "No report ID provided", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        btnOpenMap.setOnClickListener(v -> openInMaps());

        loadReportDetails();
    }

    private void loadReportDetails() {
        FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
        if (currentUser == null) {
            Toast.makeText(this, "User not authenticated", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        progressBar.setVisibility(View.VISIBLE);

        currentUser.getIdToken(true).addOnCompleteListener(task -> {
            if (task.isSuccessful() && task.getResult() != null) {
                String authHeader = "Bearer " + task.getResult().getToken();
                fetchReportDetails(authHeader);
            } else {
                Log.e(TAG, "Failed to get ID token", task.getException());
                progressBar.setVisibility(View.GONE);
                Toast.makeText(this, "Authentication failed", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void fetchReportDetails(String authHeader) {
        ApiService apiService = RetrofitClient.getApiService();
        Call<ReportResponse> call = apiService.getReportStatus(authHeader, reportId);

        call.enqueue(new Callback<ReportResponse>() {
            @Override
            public void onResponse(@NonNull Call<ReportResponse> call, @NonNull Response<ReportResponse> response) {
                progressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    displayReportDetails(response.body());
                } else {
                    Toast.makeText(ReportDetailsActivity.this, "Failed to load report details", Toast.LENGTH_SHORT)
                            .show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<ReportResponse> call, @NonNull Throwable t) {
                progressBar.setVisibility(View.GONE);
                Log.e(TAG, "Error loading report", t);
                Toast.makeText(ReportDetailsActivity.this, "Error: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void displayReportDetails(ReportResponse report) {
        // Display status with severity and creation date
        String statusText = "Status: " + report.getStatus();
        if (report.getSeverity() != null) {
            statusText += " | Severity: " + report.getSeverity();
        }
        if (report.getCreatedAt() != null) {
            statusText += "\nCreated: " + report.getCreatedAt();
        }
        tvStatus.setText(statusText);

        // Display AI reasons
        if (report.getAiResult() != null) {
            List<String> reasons = report.getAiResult().getReasons();
            if (reasons != null && !reasons.isEmpty()) {
                tvMessage.setText(String.join(", ", reasons));
            } else {
                tvMessage.setText("No additional information");
            }
        } else {
            tvMessage.setText("No AI result available");
        }

        // Display location
        if (report.getLat() != 0 || report.getLng() != 0) {
            lat = report.getLat();
            lng = report.getLng();
            tvLocation.setText(String.format("Location: %.6f, %.6f", lat, lng));
            btnOpenMap.setEnabled(true);
        } else {
            tvLocation.setText("Location data unavailable");
            btnOpenMap.setEnabled(false);
        }

        // Display device name
        if (report.getDeviceName() != null && !report.getDeviceName().isEmpty()) {
            tvDeviceName.setText("Device: " + report.getDeviceName());
        } else {
            tvDeviceName.setText("Device info unavailable");
        }

        // Load image
        if (report.getImageUrl() != null && !report.getImageUrl().isEmpty()) {
            Glide.with(this)
                    .load(report.getImageUrl())
                    .placeholder(android.R.drawable.ic_menu_gallery)
                    .error(android.R.drawable.ic_menu_close_clear_cancel)
                    .into(ivReportImage);
        } else {
            ivReportImage.setImageResource(android.R.drawable.ic_menu_gallery);
        }
    }

    private void openInMaps() {
        if (lat != 0 || lng != 0) {
            Uri gmmIntentUri = Uri.parse("geo:" + lat + "," + lng);
            Intent mapIntent = new Intent(Intent.ACTION_VIEW, gmmIntentUri);
            mapIntent.setPackage("com.google.android.apps.maps");
            if (mapIntent.resolveActivity(getPackageManager()) != null) {
                startActivity(mapIntent);
            } else {
                Toast.makeText(this, "Google Maps not installed", Toast.LENGTH_SHORT).show();
            }
        }
    }
}
