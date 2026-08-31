package com.example.firewatchreportingapp.fragments;

import android.Manifest;
import android.content.pm.PackageManager;
import android.location.Location;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.fragment.app.Fragment;

import com.example.firewatchreportingapp.ReportFlowActivity;
import com.example.firewatchreportingapp.databinding.FragmentCaptureBinding;
import com.example.firewatchreportingapp.models.Report;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;
import com.google.common.util.concurrent.ListenableFuture;

import java.io.File;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

public class CaptureFragment extends Fragment {

    private static final String TAG = "CaptureFragment";
    private FragmentCaptureBinding binding;
    private ImageCapture imageCapture;
    private FusedLocationProviderClient fusedLocationClient;
    private boolean locationFetched = false;

    private final ActivityResultLauncher<String[]> requestPermissionsLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestMultiplePermissions(), result -> {
                boolean cameraGranted = result.getOrDefault(Manifest.permission.CAMERA, false);
                boolean locationGranted = result.getOrDefault(Manifest.permission.ACCESS_FINE_LOCATION, false);

                if (cameraGranted) {
                    startCamera();
                } else {
                    Toast.makeText(getContext(), "Camera permission is required", Toast.LENGTH_SHORT).show();
                }

                if (locationGranted) {
                    fetchLocation();
                } else {
                    Toast.makeText(getContext(), "Location permission is required for accurate reporting",
                            Toast.LENGTH_SHORT).show();
                }
            });

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        binding = FragmentCaptureBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(requireActivity());

        checkAndRequestPermissions();

        binding.btnCapture.setOnClickListener(v -> takePhoto());
    }

    private void checkAndRequestPermissions() {
        boolean cameraGranted = ContextCompat.checkSelfPermission(requireContext(),
                Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        boolean locationGranted = ContextCompat.checkSelfPermission(requireContext(),
                Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;

        if (cameraGranted && locationGranted) {
            startCamera();
            fetchLocation();
        } else {
            String[] permissions = new String[] {
                    Manifest.permission.CAMERA,
                    Manifest.permission.ACCESS_FINE_LOCATION
            };
            requestPermissionsLauncher.launch(permissions);
        }
    }

    private void fetchLocation() {
        if (ContextCompat.checkSelfPermission(requireContext(),
                Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        CancellationTokenSource cancellationTokenSource = new CancellationTokenSource();

        fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellationTokenSource.getToken())
                .addOnSuccessListener(requireActivity(), location -> {
                    if (location != null) {
                        Report report = ((ReportFlowActivity) requireActivity()).getCurrentReport();
                        report.setLat(location.getLatitude());
                        report.setLng(location.getLongitude());
                        report.setAccuracy(location.getAccuracy());
                        locationFetched = true;
                        Log.d(TAG, "Location fetched: " + location.getLatitude() + ", " + location.getLongitude());
                    } else {
                        Log.w(TAG, "Location is null");
                        Toast.makeText(getContext(), "Unable to fetch location", Toast.LENGTH_SHORT).show();
                    }
                })
                .addOnFailureListener(requireActivity(), e -> {
                    Log.e(TAG, "Failed to fetch location", e);
                    Toast.makeText(getContext(), "Failed to fetch location", Toast.LENGTH_SHORT).show();
                });
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> cameraProviderFuture = ProcessCameraProvider
                .getInstance(requireContext());

        cameraProviderFuture.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = cameraProviderFuture.get();

                Preview preview = new Preview.Builder().build();
                preview.setSurfaceProvider(binding.previewView.getSurfaceProvider());

                imageCapture = new ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build();

                CameraSelector cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA;

                cameraProvider.unbindAll();
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture);

            } catch (ExecutionException | InterruptedException e) {
                Log.e(TAG, "Error starting camera", e);
            }
        }, ContextCompat.getMainExecutor(requireContext()));
    }

    private void takePhoto() {
        if (imageCapture == null)
            return;

        // Create a File in cache
        File photoFile = new File(requireContext().getCacheDir(), "firewatch_" + System.currentTimeMillis() + ".jpg");

        ImageCapture.OutputFileOptions outputOptions = new ImageCapture.OutputFileOptions.Builder(photoFile).build();

        imageCapture.takePicture(outputOptions, ContextCompat.getMainExecutor(requireContext()),
                new ImageCapture.OnImageSavedCallback() {
                    @Override
                    public void onImageSaved(@NonNull ImageCapture.OutputFileResults outputFileResults) {
                        // Log file size
                        Log.e(TAG, "Saved file path=" + photoFile.getAbsolutePath() + " size=" + photoFile.length());

                        // Build file:// Uri
                        String uriString = Uri.fromFile(photoFile).toString();

                        // Save to report
                        ((ReportFlowActivity) requireActivity()).getCurrentReport().setImageUri(uriString);

                        // Navigate
                        ((ReportFlowActivity) requireActivity()).navigateToPreview(uriString);
                    }

                    @Override
                    public void onError(@NonNull ImageCaptureException exception) {
                        Log.e(TAG, "Photo capture failed: " + exception.getMessage(), exception);
                        Toast.makeText(getContext(), "Failed to capture photo", Toast.LENGTH_SHORT).show();
                    }
                });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
