package com.example.firewatchreportingapp;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.firewatchreportingapp.api.ApiService;
import com.example.firewatchreportingapp.api.RetrofitClient;
import com.example.firewatchreportingapp.api.models.MyReportsResponse;
import com.example.firewatchreportingapp.api.models.ReportListItem;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class HistoryActivity extends AppCompatActivity {

    private static final String TAG = "HistoryActivity";
    private RecyclerView recyclerView;
    private ReportHistoryAdapter adapter;
    private View progressBar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_history);

        recyclerView = findViewById(R.id.recyclerReports);
        progressBar = findViewById(R.id.progress);

        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        adapter = new ReportHistoryAdapter(new ArrayList<>(), this::onReportClicked);
        recyclerView.setAdapter(adapter);

        loadReports();
    }

    private void loadReports() {
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
                fetchReports(authHeader);
            } else {
                Log.e(TAG, "Failed to get ID token", task.getException());
                progressBar.setVisibility(View.GONE);
                Toast.makeText(this, "Authentication failed", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void fetchReports(String authHeader) {
        ApiService apiService = RetrofitClient.getApiService();
        Call<MyReportsResponse> call = apiService.getMyReports(authHeader);

        call.enqueue(new Callback<MyReportsResponse>() {
            @Override
            public void onResponse(@NonNull Call<MyReportsResponse> call,
                    @NonNull Response<MyReportsResponse> response) {
                progressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    List<ReportListItem> reports = response.body().getReports();
                    adapter.updateReports(reports != null ? reports : new ArrayList<>());
                } else {
                    Toast.makeText(HistoryActivity.this, "Failed to load reports", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<MyReportsResponse> call, @NonNull Throwable t) {
                progressBar.setVisibility(View.GONE);
                Log.e(TAG, "Error loading reports", t);
                Toast.makeText(HistoryActivity.this, "Error: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void onReportClicked(ReportListItem report) {
        Intent intent = new Intent(this, ReportDetailsActivity.class);
        intent.putExtra("reportId", report.getReportId());
        startActivity(intent);
    }
}
