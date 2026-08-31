package com.example.firewatchreportingapp.api;

import com.example.firewatchreportingapp.api.models.MyReportsResponse;
import com.example.firewatchreportingapp.api.models.OverrideRequest;
import com.example.firewatchreportingapp.api.models.ReportResponse;
import com.example.firewatchreportingapp.api.models.UploadResponse;

import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.Multipart;
import retrofit2.http.POST;
import retrofit2.http.Part;
import retrofit2.http.Path;

public interface ApiService {

        @Multipart
        @POST("reports")
        Call<UploadResponse> uploadReport(
                        @Header("Authorization") String authHeader,
                        @Part MultipartBody.Part image,
                        @Part("title") RequestBody title,
                        @Part("description") RequestBody description,
                        @Part("severity") RequestBody severity,
                        @Part("lat") RequestBody lat,
                        @Part("lng") RequestBody lng,
                        @Part("deviceName") RequestBody deviceName,
                        @Part("deviceTime") RequestBody deviceTime);

        @GET("reports/{id}")
        Call<ReportResponse> getReportStatus(
                        @Header("Authorization") String authHeader,
                        @Path("id") String reportId);

        @POST("reports/{id}/override")
        Call<ReportResponse> overrideReport(
                        @Header("Authorization") String authHeader,
                        @Path("id") String reportId,
                        @Body OverrideRequest request);

        @GET("reports/mine")
        Call<MyReportsResponse> getMyReports(@Header("Authorization") String authHeader);
}
