package com.example.firewatchreportingapp.fragments;

import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.example.firewatchreportingapp.api.ApiService;
import com.example.firewatchreportingapp.api.RetrofitClient;
import com.example.firewatchreportingapp.api.models.OverrideRequest;
import com.example.firewatchreportingapp.api.models.ReportResponse;
import com.example.firewatchreportingapp.databinding.FragmentResultBinding;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ResultFragment extends Fragment {

    private static final String TAG = "ResultFragment";
    private static final String ARG_REPORT_ID = "report_id";
    private static final String ARG_STATUS = "status";
    private static final String ARG_MESSAGE = "message";

    private FragmentResultBinding binding;
    private String reportId;
    private String status;
    private String message;

    public static ResultFragment newInstance(String reportId, String status, String message) {
        ResultFragment fragment = new ResultFragment();
        Bundle args = new Bundle();
        args.putString(ARG_REPORT_ID, reportId);
        args.putString(ARG_STATUS, status);
        args.putString(ARG_MESSAGE, message);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            reportId = getArguments().getString(ARG_REPORT_ID);
            status = getArguments().getString(ARG_STATUS);
            message = getArguments().getString(ARG_MESSAGE);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        binding = FragmentResultBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        updateUI();

        binding.btnResubmit.setOnClickListener(v -> handleOverride());

        binding.btnDone.setOnClickListener(v -> {
            requireActivity().finish();
        });
    }

    private void updateUI() {
        if ("SUBMITTED".equals(status) || "SUBMITTED_OVERRIDE".equals(status)) {
            binding.tvResultTitle.setText("Report Submitted!");
            binding.tvResultMessage.setText(message != null && !message.isEmpty()
                    ? message
                    : "Your fire report has been successfully submitted.");
            binding.btnResubmit.setVisibility(View.GONE);
        } else if ("REJECTED_AI".equals(status)) {
            binding.tvResultTitle.setText("Report Rejected by AI");
            binding.tvResultMessage.setText(message != null && !message.isEmpty()
                    ? "AI detected issues: " + message
                    : "The AI has rejected this report. You can manually override this decision.");
            binding.btnResubmit.setVisibility(View.VISIBLE);
            binding.btnResubmit.setText("Manual Override");
        } else if ("PENDING_AI".equals(status)) {
            binding.tvResultTitle.setText("Processing...");
            binding.tvResultMessage.setText("Your report is being processed.");
            binding.btnResubmit.setVisibility(View.GONE);
        } else {
            binding.tvResultTitle.setText("Report Status");
            binding.tvResultMessage.setText(message != null ? message : "Status: " + status);
            binding.btnResubmit.setVisibility(View.GONE);
        }
    }

    private void handleOverride() {
        binding.btnResubmit.setEnabled(false);
        binding.btnResubmit.setText("Submitting override...");

        // Fetch Firebase token first
        com.google.firebase.auth.FirebaseUser currentUser = com.google.firebase.auth.FirebaseAuth.getInstance()
                .getCurrentUser();
        if (currentUser == null) {
            binding.btnResubmit.setEnabled(true);
            binding.btnResubmit.setText("Manual Override");
            Toast.makeText(getContext(), "User not authenticated", Toast.LENGTH_SHORT).show();
            return;
        }

        currentUser.getIdToken(true).addOnCompleteListener(task -> {
            if (task.isSuccessful() && task.getResult() != null) {
                String authHeader = "Bearer " + task.getResult().getToken();
                performOverride(authHeader);
            } else {
                Log.e(TAG, "Failed to get ID token", task.getException());
                binding.btnResubmit.setEnabled(true);
                binding.btnResubmit.setText("Manual Override");
                Toast.makeText(getContext(), "Authentication failed", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void performOverride(String authHeader) {
        ApiService apiService = RetrofitClient.getApiService();
        OverrideRequest request = new OverrideRequest(true);
        Call<ReportResponse> call = apiService.overrideReport(authHeader, reportId, request);

        call.enqueue(new Callback<ReportResponse>() {
            @Override
            public void onResponse(Call<ReportResponse> call, Response<ReportResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    status = response.body().getStatus();
                    message = "Manual override successful";
                    updateUI();
                    Toast.makeText(getContext(), "Override successful!", Toast.LENGTH_SHORT).show();
                } else {
                    binding.btnResubmit.setEnabled(true);
                    binding.btnResubmit.setText("Manual Override");
                    Toast.makeText(getContext(), "Override failed: " + response.code(), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ReportResponse> call, Throwable t) {
                Log.e(TAG, "Override error", t);
                binding.btnResubmit.setEnabled(true);
                binding.btnResubmit.setText("Manual Override");
                Toast.makeText(getContext(), "Override error: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
