package com.resq.app;

import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.linecorp.linesdk.LineApiError;
import com.linecorp.linesdk.Scope;
import com.linecorp.linesdk.auth.LineAuthenticationParams;
import com.linecorp.linesdk.auth.LineLoginApi;
import com.linecorp.linesdk.auth.LineLoginResult;

import java.util.Arrays;

/**
 * Bridges the LINE SDK's app-to-app login (hands off directly to the LINE
 * app itself, which the user is presumably already signed into, instead of
 * a browser-based OAuth redirect that always shows a fresh login form) to
 * the web layer. Only the ID token is returned -- src/lib/auth.ts sends it
 * to the line-login-exchange Edge Function, which verifies it server-side
 * against LINE's own /oauth2/v2.1/verify endpoint before trusting any of
 * its claims (a client-supplied token is never trusted as-is).
 *
 * Requires the app's package name + signing certificate's SHA-1 fingerprint
 * to be registered in the LINE Developers Console (LINE Login channel ->
 * Android section) -- without that, LINE returns an
 * AUTHENTICATION_AGENT_ERROR instead of completing the handoff.
 */
@CapacitorPlugin(name = "LineLogin")
public class LineLoginPlugin extends Plugin {

    @PluginMethod
    public void login(PluginCall call) {
        String channelId = call.getString("channelId");
        if (channelId == null || channelId.isEmpty()) {
            call.reject("Missing channelId");
            return;
        }
        LineAuthenticationParams params = new LineAuthenticationParams.Builder()
            .scopes(Arrays.asList(Scope.OPENID_CONNECT, Scope.PROFILE))
            .build();
        Intent loginIntent = LineLoginApi.getLoginIntent(getContext(), channelId, params);
        startActivityForResult(call, loginIntent, "handleLoginResult");
    }

    @ActivityCallback
    private void handleLoginResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        LineLoginResult loginResult = LineLoginApi.getLoginResultFromIntent(result.getData());
        if (!loginResult.isSuccess()) {
            LineApiError error = loginResult.getErrorData();
            call.reject(error != null ? error.toString() : "LINE login was not completed");
            return;
        }
        if (loginResult.getLineIdToken() == null) {
            call.reject("LINE did not return an ID token");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("idToken", loginResult.getLineIdToken().getRawString());
        call.resolve(ret);
    }
}
