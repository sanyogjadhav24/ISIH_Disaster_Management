package com.example.firewatchreportingapp;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.firewatchreportingapp.api.models.ReportListItem;

import java.util.List;

public class ReportHistoryAdapter extends RecyclerView.Adapter<ReportHistoryAdapter.ViewHolder> {

    private List<ReportListItem> reports;
    private OnReportClickListener listener;

    public interface OnReportClickListener {
        void onReportClick(ReportListItem report);
    }

    public ReportHistoryAdapter(List<ReportListItem> reports, OnReportClickListener listener) {
        this.reports = reports;
        this.listener = listener;
    }

    public void updateReports(List<ReportListItem> newReports) {
        this.reports = newReports;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(android.R.layout.simple_list_item_2, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        ReportListItem report = reports.get(position);
        holder.title.setText(report.getTitle() + " - " + report.getSeverity());
        holder.subtitle.setText("Status: " + report.getStatus() + " | " + report.getCreatedAt());
        holder.itemView.setOnClickListener(v -> listener.onReportClick(report));
    }

    @Override
    public int getItemCount() {
        return reports.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView title;
        TextView subtitle;

        ViewHolder(View view) {
            super(view);
            title = view.findViewById(android.R.id.text1);
            subtitle = view.findViewById(android.R.id.text2);
        }
    }
}
