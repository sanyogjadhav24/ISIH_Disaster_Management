package com.example.firewatchreportingapp.fragments;

import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.bumptech.glide.Glide;
import com.example.firewatchreportingapp.ReportFlowActivity;
import com.example.firewatchreportingapp.databinding.FragmentPreviewBinding;

public class PreviewFragment extends Fragment {

    private static final String ARG_IMAGE_URI = "image_uri";
    private FragmentPreviewBinding binding;
    private String imageUri;

    public static PreviewFragment newInstance(String imageUri) {
        PreviewFragment fragment = new PreviewFragment();
        Bundle args = new Bundle();
        args.putString(ARG_IMAGE_URI, imageUri);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            imageUri = getArguments().getString(ARG_IMAGE_URI);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        binding = FragmentPreviewBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        // Check if imageUri is null or empty
        if (TextUtils.isEmpty(imageUri)) {
            Toast.makeText(getContext(), "No image found, please retake", Toast.LENGTH_SHORT).show();
            ((ReportFlowActivity) requireActivity()).navigateBackToCapture();
            return;
        }

        Glide.with(this)
                .load(Uri.parse(imageUri))
                .into(binding.ivPreview);

        binding.btnRetake.setOnClickListener(v -> ((ReportFlowActivity) requireActivity()).navigateBackToCapture());

        binding.btnNext.setOnClickListener(v -> {
            // Save imageUri into current report
            ((ReportFlowActivity) requireActivity()).getCurrentReport().setImageUri(imageUri);
            ((ReportFlowActivity) requireActivity()).navigateToDetails();
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
