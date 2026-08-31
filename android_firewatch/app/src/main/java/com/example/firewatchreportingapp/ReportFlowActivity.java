package com.example.firewatchreportingapp;

import android.os.Build;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;

import com.example.firewatchreportingapp.databinding.ActivityReportFlowBinding;
import com.example.firewatchreportingapp.fragments.CaptureFragment;
import com.example.firewatchreportingapp.fragments.DetailsFragment;
import com.example.firewatchreportingapp.fragments.PreviewFragment;
import com.example.firewatchreportingapp.fragments.ResultFragment;
import com.example.firewatchreportingapp.fragments.SubmittingFragment;
import com.example.firewatchreportingapp.models.Report;

public class ReportFlowActivity extends AppCompatActivity {

    private ActivityReportFlowBinding binding;
    private Report currentReport;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityReportFlowBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        currentReport = new Report();
        currentReport.setTimestamp(System.currentTimeMillis());
        currentReport.setDeviceTimeMillis(System.currentTimeMillis());
        currentReport.setDeviceName(Build.MANUFACTURER + " " + Build.MODEL);

        if (savedInstanceState == null) {
            loadFragment(new CaptureFragment());
        }
    }

    public void loadFragment(Fragment fragment) {
        FragmentManager fragmentManager = getSupportFragmentManager();
        fragmentManager.beginTransaction()
                .replace(R.id.fragment_container, fragment)
                .commit();
    }

    public void navigateToPreview(String imageUri) {
        currentReport.setImageUri(imageUri);
        loadFragment(PreviewFragment.newInstance(imageUri));
    }

    public void navigateToDetails() {
        loadFragment(new DetailsFragment());
    }

    public void navigateToSubmitting(String title, String description, String severity) {
        currentReport.setTitle(title);
        currentReport.setDescription(description);
        currentReport.setSeverity(severity);
        loadFragment(SubmittingFragment.newInstance(currentReport));
    }

    public void navigateToResult(String reportId, String status, String message) {
        currentReport.setId(reportId);
        currentReport.setStatus(status);
        loadFragment(ResultFragment.newInstance(reportId, status, message));
    }

    public void navigateBackToCapture() {
        loadFragment(new CaptureFragment());
    }

    public Report getCurrentReport() {
        return currentReport;
    }

    @Override
    public void onBackPressed() {
        if (getSupportFragmentManager().getBackStackEntryCount() > 0) {
            getSupportFragmentManager().popBackStack();
        } else {
            super.onBackPressed();
        }
    }
}
