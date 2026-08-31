package com.example.firewatchreportingapp.fragments;

import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.example.firewatchreportingapp.ReportFlowActivity;
import com.example.firewatchreportingapp.api.ApiService;
import com.example.firewatchreportingapp.api.RetrofitClient;
import com.example.firewatchreportingapp.api.models.ReportResponse;
import com.example.firewatchreportingapp.api.models.UploadResponse;
import com.example.firewatchreportingapp.databinding.FragmentSubmittingBinding;
import com.example.firewatchreportingapp.models.Report;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import java.io.File;
import java.util.List;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class SubmittingFragment extends Fragment {

    private static final String TAG = "SubmittingFragment";
    private static final String ARG_REPORT = "report";
    private static final int POLL_INTERVAL_MS = 2000; // 2 seconds

    private FragmentSubmittingBinding binding;
    private Report report;
    private Handler pollHandler;
    private Runnable pollRunnable;
    private String reportId;
    private String authHeader;

    public static SubmittingFragment newInstance(Report report) {
        SubmittingFragment fragment = new SubmittingFragment();
        Bundle args = new Bundle();
        args.putSerializable(ARG_REPORT, (java.io.Serializable) report);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            report = (Report) getArguments().getSerializable(ARG_REPORT);
        }
        pollHandler = new Handler(Looper.getMainLooper());
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        binding = FragmentSubmittingBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        binding.tvStatus.setText("Uploading report...");
        uploadReport();
    }

    private void uploadReport() {
        // Validate imageUri
        if (report.getImageUri() == null || report.getImageUri().isEmpty()) {
            binding.tvStatus.setText("No image selected");
            Toast.makeText(getContext(), "No image selected", Toast.LENGTH_SHORT).show();
            return;
        }

        FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
        if (currentUser == null) {
            binding.tvStatus.setText("User not authenticated");
            Toast.makeText(getContext(), "User not authenticated", Toast.LENGTH_SHORT).show();
            return;
        }

        // Get Firebase ID token
        currentUser.getIdToken(true).addOnCompleteListener(task -> {
            if (task.isSuccessful() && task.getResult() != null) {
                String idToken = task.getResult().getToken();
                authHeader = "Bearer " + idToken;
                performUpload(authHeader);
            } else {
                Log.e(TAG, "Failed to get ID token", task.getException());
                binding.tvStatus.setText("Authentication failed");
                Toast.makeText(getContext(), "Authentication failed", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void performUpload(String authHeader) {
        try {
            // Parse URI and copy to cache file
            Uri imageUri = Uri.parse(report.getImageUri());
            File imgFile = com.example.firewatchreportingapp.utils.UriFileUtils.copyUriToCacheFile(
                    requireContext(), imageUri, "firewatch");

            Log.e(TAG, "Prepared image file size=" + imgFile.length());

            if (imgFile.length() == 0) {
                binding.tvStatus.setText("Image file is empty. Please retake the photo.");
                Toast.makeText(getContext(), "Image is empty. Retake photo.", Toast.LENGTH_SHORT).show();
                return;
            }

            RequestBody requestFile = RequestBody.create(imgFile, MediaType.parse("image/*"));
            MultipartBody.Part imagePart = MultipartBody.Part.createFormData("image", imgFile.getName(), requestFile);

            RequestBody title = RequestBody.create(MediaType.parse("text/plain"), report.getTitle());
            RequestBody description = RequestBody.create(MediaType.parse("text/plain"), report.getDescription());
            RequestBody severity = RequestBody.create(MediaType.parse("text/plain"), report.getSeverity());
            RequestBody lat = RequestBody.create(MediaType.parse("text/plain"), String.valueOf(report.getLat()));
            RequestBody lng = RequestBody.create(MediaType.parse("text/plain"), String.valueOf(report.getLng()));
            RequestBody deviceName = RequestBody.create(MediaType.parse("text/plain"), report.getDeviceName());
            RequestBody deviceTime = RequestBody.create(MediaType.parse("text/plain"),
                    String.valueOf(report.getDeviceTimeMillis()));

            ApiService apiService = RetrofitClient.getApiService();
            Call<UploadResponse> call = apiService.uploadReport(
                    authHeader, imagePart, title, description, severity, lat, lng, deviceName, deviceTime);

            call.enqueue(new Callback<UploadResponse>() {
                @Override
                public void onResponse(Call<UploadResponse> call, Response<UploadResponse> response) {
                    if (response.isSuccessful() && response.body() != null) {
                        reportId = response.body().getReportId();
                        binding.tvStatus.setText("Report uploaded. Processing with AI...");
                        startPolling();
                    } else {
                        String err = "";
                        try {
                            if (response.errorBody() != null)
                                err = response.errorBody().string();
                        } catch (Exception ignored) {
                        }
                        binding.tvStatus.setText("Upload failed: " + response.code() + "\n" + err);
                        Log.e(TAG, "Upload failed " + response.code() + " " + err);
                        Toast.makeText(getContext(), "Upload failed: " + response.code(), Toast.LENGTH_SHORT).show();
                    }
                }

                @Override
                public void onFailure(Call<UploadResponse> call, Throwable t) {
                    Log.e(TAG, "Upload error", t);
                    binding.tvStatus.setText("Upload error: " + t.getMessage());
                    Toast.makeText(getContext(), "Upload error: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error preparing upload", e);
            binding.tvStatus.setText("Upload error: " + e.getMessage());
            Toast.makeText(getContext(), "Error preparing upload: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void startPolling() {
        pollRunnable = new Runnable() {
            @Override
            public void run() {
                checkReportStatus();
            }
        };
        pollHandler.postDelayed(pollRunnable, POLL_INTERVAL_MS);
    }

    private void checkReportStatus() {
        if (authHeader == null) {
            binding.tvStatus.setText("Auth missing");
            return;
        }

        ApiService apiService = RetrofitClient.getApiService();
        Call<ReportResponse> call = apiService.getReportStatus(authHeader, reportId);

        call.enqueue(new Callback<ReportResponse>() {
            @Override
            public void onResponse(Call<ReportResponse> call, Response<ReportResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    String status = response.body().getStatus();

                    // Continue polling if still PENDING_AI
                    if ("PENDING_AI".equals(status)) {
                        pollHandler.postDelayed(pollRunnable, POLL_INTERVAL_MS);
                    } else {
                        // Status is final, navigate to result
                        stopPolling();
                        String message = buildMessageFromAiResult(response.body());
                        ((ReportFlowActivity) requireActivity()).navigateToResult(reportId, status, message);
                    }
                }
            }

            @Override
            public void onFailure(Call<ReportResponse> call, Throwable t) {
                Log.e(TAG, "Polling error", t);
                // Continue polling on error
                pollHandler.postDelayed(pollRunnable, POLL_INTERVAL_MS);
            }
        });
    }

    private String buildMessageFromAiResult(ReportResponse response) {
        if (response.getAiResult() != null && response.getAiResult().getReasons() != null) {
            List<String> reasons = response.getAiResult().getReasons();
            if (!reasons.isEmpty()) {
                return String.join(", ", reasons);
            }
        }
        return "";
    }

    private void stopPolling() {
        if (pollHandler != null && pollRunnable != null) {
            pollHandler.removeCallbacks(pollRunnable);
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        stopPolling();
        binding = null;
    }
}
