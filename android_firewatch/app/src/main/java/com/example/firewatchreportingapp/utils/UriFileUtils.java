package com.example.firewatchreportingapp.utils;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class UriFileUtils {

    public static File copyUriToCacheFile(Context context, Uri uri, String prefix) throws Exception {
        ContentResolver resolver = context.getContentResolver();

        String name = getDisplayName(resolver, uri);
        if (name == null)
            name = prefix + "_" + System.currentTimeMillis() + ".jpg";

        File outFile = new File(context.getCacheDir(), name);

        try (InputStream in = resolver.openInputStream(uri);
                FileOutputStream out = new FileOutputStream(outFile)) {

            if (in == null)
                throw new IllegalStateException("Unable to open input stream for uri");

            byte[] buf = new byte[8192];
            int len;
            while ((len = in.read(buf)) != -1) {
                out.write(buf, 0, len);
            }
            out.flush();
        }

        if (outFile.length() == 0) {
            throw new IllegalStateException("Copied image is empty (0 bytes)");
        }

        return outFile;
    }

    private static String getDisplayName(ContentResolver resolver, Uri uri) {
        Cursor cursor = null;
        try {
            cursor = resolver.query(uri, null, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0)
                    return cursor.getString(index);
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null)
                cursor.close();
        }
        return null;
    }
}
