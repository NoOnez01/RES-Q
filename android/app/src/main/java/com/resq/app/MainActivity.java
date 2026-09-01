package com.resq.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

/**
 * The app uses the browser's own getUserMedia/geolocation APIs (camera photo
 * capture, voice recordings, the WebRTC video call, GPS) rather than
 * Capacitor's native plugins, so nothing else here triggers Android's
 * runtime permission flow automatically.
 *
 * Permissions are requested reactively, exactly when the WebView asks for
 * them — not eagerly at startup. Requesting eagerly created a race: the
 * WebView could call getUserMedia() before the user had answered the OS
 * dialog, see "not granted yet", and permanently deny that call (it never
 * retries on its own). Holding the WebView's request object until
 * onRequestPermissionsResult fires avoids that entirely.
 */
public class MainActivity extends BridgeActivity {
    private static final int CAMERA_MIC_REQUEST_CODE = 1001;
    private static final int LOCATION_REQUEST_CODE = 1002;

    private PermissionRequest pendingWebViewRequest;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LineLoginPlugin.class);
        super.onCreate(savedInstanceState);

        this.bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (hasAnyGranted(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)) {
                        request.grant(request.getResources());
                        return;
                    }
                    pendingWebViewRequest = request;
                    ActivityCompat.requestPermissions(
                        MainActivity.this,
                        new String[] { Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO },
                        CAMERA_MIC_REQUEST_CODE
                    );
                });
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (hasAnyGranted(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)) {
                    callback.invoke(origin, true, false);
                    return;
                }
                pendingGeoCallback = callback;
                pendingGeoOrigin = origin;
                ActivityCompat.requestPermissions(
                    MainActivity.this,
                    new String[] { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION },
                    LOCATION_REQUEST_CODE
                );
            }
        });
    }

    private boolean hasAnyGranted(String... permissions) {
        for (String permission : permissions) {
            if (ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED) return true;
        }
        return false;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == CAMERA_MIC_REQUEST_CODE && pendingWebViewRequest != null) {
            PermissionRequest request = pendingWebViewRequest;
            pendingWebViewRequest = null;
            if (hasAnyGranted(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)) {
                request.grant(request.getResources());
            } else {
                request.deny();
            }
        }

        if (requestCode == LOCATION_REQUEST_CODE && pendingGeoCallback != null) {
            GeolocationPermissions.Callback callback = pendingGeoCallback;
            String origin = pendingGeoOrigin;
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
            boolean granted = hasAnyGranted(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION);
            callback.invoke(origin, granted, false);
        }
    }
}
