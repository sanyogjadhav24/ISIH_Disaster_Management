package com.example.firewatchreportingapp.fragments;

import android.os.Bundle;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.example.firewatchreportingapp.ReportFlowActivity;
import com.example.firewatchreportingapp.databinding.FragmentDetailsBinding;

public class DetailsFragment extends Fragment {

    private FragmentDetailsBinding binding;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        binding = FragmentDetailsBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        binding.btnSubmit.setOnClickListener(v -> {
            String title = binding.etTitle.getText().toString().trim();
            String description = binding.etDescription.getText().toString().trim();
            String severity = binding.etSeverity.getText().toString().trim();

            if (TextUtils.isEmpty(title)) {
                binding.etTitle.setError("Title is required");
                return;
            }

            if (TextUtils.isEmpty(description)) {
                binding.etDescription.setError("Description is required");
                return;
            }

            if (TextUtils.isEmpty(severity)) {
                binding.etSeverity.setError("Severity is required");
                return;
            }

            // Validate severity: must be LOW, MED, or HIGH (case-insensitive)
            String severityUpper = severity.toUpperCase();
            if (!severityUpper.equals("LOW") && !severityUpper.equals("MED") && !severityUpper.equals("HIGH")) {
                binding.etSeverity.setError("Severity must be LOW, MED, or HIGH");
                return;
            }

            ((ReportFlowActivity) requireActivity()).navigateToSubmitting(title, description, severityUpper);
        });

        binding.btnBack.setOnClickListener(v -> requireActivity().getSupportFragmentManager().popBackStack());
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
