{
  description = "mu — clean-room re-implementation of pi-tui in GPUix";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      lib = nixpkgs.lib;
      pkgs = nixpkgs.legacyPackages.${system};

      # App source (cleaned: VCS dropped; the local node_modules is removed in
      # the installPhase so the build assembles a fresh one).
      src = lib.cleanSource ./.;

      # Runtime library path of the @gpuix/native .node (libxkbcommon + the
      # dlopened wayland/EGL/Vulkan libraries).
      libs = lib.makeLibraryPath [
        pkgs.libxkbcommon
        pkgs.wayland
        pkgs.mesa
        pkgs.vulkan-loader
      ];

      # XDG desktop entry, built declaratively: the app is a bun --compile
      # binary, so there is no upstream .desktop file to install. Icon= is the
      # icon id of the scalable mark in assets/net.knoopx.mu.svg, which the
      # package installs under share/icons/hicolor/scalable/apps.
      desktopEntry = pkgs.writeTextDir "share/applications/net.knoopx.mu.desktop" ''
        [Desktop Entry]
        Type=Application
        Version=1.5
        Name=mu
        GenericName=Coding agent
        Comment=GPU-rendered desktop client for the pi coding agent
        Exec=mu %U
        Icon=net.knoopx.mu
        Terminal=false
        Categories=Development;TextEditor;Utility;
        Keywords=pi;agent;coding;ai;chat;gpuix;
        StartupWMClass=mu
      '';

      # adwaita-gpuix is a source-only repo (there is no npm tarball for it):
      # fetch the source tree and copy it into node_modules as-is. Bump `rev`
      # to move the pin (then update `hash` from the nix error it prints).
      adwaitaSrc = pkgs.fetchFromGitHub {
        owner = "knoopx";
        repo = "adwaita-gpuix";
        rev = "1fe1f1e0a53d5d73dcdc14ebc22a959f4d1940f5";
        hash = "sha256-oDx18LVECwJqPAfmomm2O/5GeXDLLeV3VJZUFw2EoJ8=";
      };

      # Every npm (registry) dependency, direct and transitive, of the bundle
      # bun build --compile resolves out of app.tsx — prefetched as a
      # content-addressed tarball (substitutable FOD); the app build untars them
      # offline. retry and google-logging-utils resolve in two versions, so the
      # non-hoisted one is nested under its importer.
      npmDeps = {
        anthropicAiSdk = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@anthropic-ai/sdk/-/sdk-0.129.0.tgz";
          hash = "sha256-2vuhMUcdL+mPrduu1/uNWQ76M03/iB/e5qDYpuHi37I=";
        };
        earendilWorksPiAgentCore = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@earendil-works/pi-agent-core/-/pi-agent-core-1.3.0.tgz";
          hash = "sha256-9xsJgPVH20N9fH5mzH6wJPpvb6+2g4w1b23kYqCtBBo=";
        };
        earendilWorksPiAi = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@earendil-works/pi-ai/-/pi-ai-1.3.0.tgz";
          hash = "sha256-U0PhY5vzQ73DNE3zrWwxwFpQtoutB6xrzhCJDUtrimE=";
        };
        earendilWorksPiCodemode = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@earendil-works/pi-codemode/-/pi-codemode-1.3.0.tgz";
          hash = "sha256-BK6OC69YgBeXDaIBcyZLZvY4ICZ6qbLaH6ZrfFUon6M=";
        };
        earendilWorksPiCodingAgent = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@earendil-works/pi-coding-agent/-/pi-coding-agent-1.3.0.tgz";
          hash = "sha256-rieF6HC4GoyOHURRCle17gv8npdGeawvqq2kqr7j08A=";
        };
        earendilWorksPiMcp = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@earendil-works/pi-mcp/-/pi-mcp-1.3.0.tgz";
          hash = "sha256-qYlidJJiBFtf948fpkMgkepd1RkmdYxmSl7zC6oaJWA=";
        };
        earendilWorksPiTui = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@earendil-works/pi-tui/-/pi-tui-1.3.0.tgz";
          hash = "sha256-Hve2MKrGqXlvOVliv9Wy5YjADQUCuU2POuh3Iq9C710=";
        };
        googleGenai = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@google/genai/-/genai-2.21.0.tgz";
          hash = "sha256-hZ4H0/7hRTztPWDC1IzhuIiU0nhbI/PL2FDAYryh38Y=";
        };
        gpuixNative = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@gpuix/native/-/native-0.10.0.tgz";
          hash = "sha256-BPnE4AHcOKJYhqIdcp7q+KSAJ2BNz3LOFFEixkZxRqc=";
        };
        gpuixNativeLinuxX64Gnu = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@gpuix/native-linux-x64-gnu/-/native-linux-x64-gnu-0.10.0.tgz";
          hash = "sha256-ilVYHnqCHyeqcvLJITIQIP1KjF4OFvqtZ7jBZdbj74k=";
        };
        gpuixReact = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@gpuix/react/-/react-0.10.0.tgz";
          hash = "sha256-qbcLb4DriWlWVHez7uT5whJdJCdDl+3nWdqiVMVVC8I=";
        };
        iconifyJsonMaterialSymbols = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@iconify-json/material-symbols/-/material-symbols-1.2.98.tgz";
          hash = "sha256-FC1Qvyjn24U2J5W+M168KdrGEdc8QE/B5vxcwZjis9A=";
        };
        # OpenUI Lang: the parser (lang-core) and the React renderer
        # (react-lang) the openui plugin is written against, plus react-lang's
        # own deps — the devtools hook and the observability sink it imports
        # statically, and ci-info behind lang-core. react-lang's `lucide-react`
        # dependency stays out: nothing in the devtools entry it reaches
        # imports it.
        openuiDevtools = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@openuidev/devtools/-/devtools-0.3.1.tgz";
          hash = "sha256-mevxerXRFNQWuqundtsseeLC5QJcyYgK/sd0c/8Kp64=";
        };
        openuiLangCore = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@openuidev/lang-core/-/lang-core-1.0.2.tgz";
          hash = "sha256-FlWXwxtVH1Mhvgm+NtUhD1R6lDzwu2xhMriXTWzV2+A=";
        };
        openuiObservability = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@openuidev/observability/-/observability-0.0.4.tgz";
          hash = "sha256-yULp0L2pjTl7Lcjhe85Ise+ABkzLBeyRT7Jjk6ThyXc=";
        };
        openuiReactLang = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@openuidev/react-lang/-/react-lang-1.0.2.tgz";
          hash = "sha256-FhlwWntOUO4jWSPZMRpj3NKX1kaHs+k2usenGzHcdfw=";
        };
        silviaOdwyerPhotonNode = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@silvia-odwyer/photon-node/-/photon-node-0.3.4.tgz";
          hash = "sha256-WiMBXBzSw448SS3ZaSmYUke5L1LS/w+5SNKe3KUrxQo=";
        };
        stablelibBase64 = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@stablelib/base64/-/base64-1.0.1.tgz";
          hash = "sha256-ATBxHS4NP4dDbHgl2x81vWE0+6LtpksN9D14H5tqWWo=";
        };
        agentBase = pkgs.fetchurl {
          url = "https://registry.npmjs.org/agent-base/-/agent-base-7.1.4.tgz";
          hash = "sha256-fdSmFmippOjU6QPxolT5TVPa/T8xbyubWXxa2MectX4=";
        };
        balancedMatch = pkgs.fetchurl {
          url = "https://registry.npmjs.org/balanced-match/-/balanced-match-4.0.4.tgz";
          hash = "sha256-kCVQjZEl7uUxu8Sc465WAYOXWtWV8FjDeL1Wr0FS+xY=";
        };
        base64Js = pkgs.fetchurl {
          url = "https://registry.npmjs.org/base64-js/-/base64-js-1.5.1.tgz";
          hash = "sha256-sbepRbUmhSaQg0JSFtZZfjPZe/IWmdZW6S/bPrUhCoU=";
        };
        bignumberJs = pkgs.fetchurl {
          url = "https://registry.npmjs.org/bignumber.js/-/bignumber.js-9.3.1.tgz";
          hash = "sha256-9alD6ikOZvZMua2q7S/xt8TuAqTMqdcJ2cnGwiJRLoI=";
        };
        braceExpansion = pkgs.fetchurl {
          url = "https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.12.tgz";
          hash = "sha256-74RI7HjyC2kvBPptAfObWrNMZkBL6jQp9aOcbJ4L6LQ=";
        };
        bufferEqualConstantTime = pkgs.fetchurl {
          url = "https://registry.npmjs.org/buffer-equal-constant-time/-/buffer-equal-constant-time-1.0.1.tgz";
          hash = "sha256-j0VRWeNCED54VO1qTMc+26sUTYV5F8iO3v6oYvCf51o=";
        };
        chalk = pkgs.fetchurl {
          url = "https://registry.npmjs.org/chalk/-/chalk-6.0.0.tgz";
          hash = "sha256-hdDOJrimCY04JtnsF88Wx6kybfzj8lRezBEzWByYE5k=";
        };
        # OpenUI Lang: lang-core's CI detection.
        ciInfo = pkgs.fetchurl {
          url = "https://registry.npmjs.org/ci-info/-/ci-info-4.4.0.tgz";
          hash = "sha256-kNyRQEry8DVPyK8eYZXt3D30oha5Su19pgIia0zaWR8=";
        };
        crossSpawn = pkgs.fetchurl {
          url = "https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz";
          hash = "sha256-GIwyDNxBOt/sAwmP2nKvepsCFSuhPTqPh/Fy2TztOOo=";
        };
        debug = pkgs.fetchurl {
          url = "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz";
          hash = "sha256-icGsnJRu6JBah1g3EUUo6X7q414DvjGQWEsiFq9D5Kc=";
        };
        diff = pkgs.fetchurl {
          url = "https://registry.npmjs.org/diff/-/diff-8.0.4.tgz";
          hash = "sha256-71EyetWCQ89TMyYhn166pQKSgL0Pr8wR98IxVmOVk9Y=";
        };
        ecdsaSigFormatter = pkgs.fetchurl {
          url = "https://registry.npmjs.org/ecdsa-sig-formatter/-/ecdsa-sig-formatter-1.0.11.tgz";
          hash = "sha256-SHy5Tf8kFHcsO7ZIpeTkHAPLvMZCY9CKVuNtc1/ISP4=";
        };
        eventsourceParser = pkgs.fetchurl {
          url = "https://registry.npmjs.org/eventsource-parser/-/eventsource-parser-4.1.2.tgz";
          hash = "sha256-2ILcUCLgrDmEpvt0fZiTpzFnWgp9neAd424KrQJgyGw=";
        };
        extend = pkgs.fetchurl {
          url = "https://registry.npmjs.org/extend/-/extend-3.0.2.tgz";
          hash = "sha256-HZHQsPqlDLoiP6k3x7WkpmKWix14s+WdylyRfdXPcrI=";
        };
        fastSha256 = pkgs.fetchurl {
          url = "https://registry.npmjs.org/fast-sha256/-/fast-sha256-1.3.0.tgz";
          hash = "sha256-T4l+ollNyc+xJQ59TQ9ltPEFlSqAL/8tBpkL8dwshPY=";
        };
        gaxios = pkgs.fetchurl {
          url = "https://registry.npmjs.org/gaxios/-/gaxios-7.3.1.tgz";
          hash = "sha256-Q5xMO0NQEckvnHJb1GHiJTpODG14DxtwV6RfWRxpmZw=";
        };
        gcpMetadata = pkgs.fetchurl {
          url = "https://registry.npmjs.org/gcp-metadata/-/gcp-metadata-8.1.2.tgz";
          hash = "sha256-+cPyyGh1XAdBUuzSkXM8VsU2Z4sChMNMNhM2W8cw25Q=";
        };
        getEastAsianWidth = pkgs.fetchurl {
          url = "https://registry.npmjs.org/get-east-asian-width/-/get-east-asian-width-1.6.0.tgz";
          hash = "sha256-RFH1ji9aTvJ66LS6JbZL6X06hBPchhSkMhoQ1Bju5tc=";
        };
        googleAuthLibrary = pkgs.fetchurl {
          url = "https://registry.npmjs.org/google-auth-library/-/google-auth-library-10.9.1.tgz";
          hash = "sha256-SZUwuFQo6id4Wo6hdyRY1rgh0skXy8Guj4hD3Km1Mno=";
        };
        googleLoggingUtils113 = pkgs.fetchurl {
          url = "https://registry.npmjs.org/google-logging-utils/-/google-logging-utils-1.1.3.tgz";
          hash = "sha256-OpIcDU4zP5S+cm/CwM4QAl+Nh/j65a/6AaUrLaeXC70=";
        };
        googleLoggingUtils120 = pkgs.fetchurl {
          url = "https://registry.npmjs.org/google-logging-utils/-/google-logging-utils-1.2.0.tgz";
          hash = "sha256-AO4YPHDaupKOFsoudvl/xj6KS7HLcnrRTUKL+WV/pOo=";
        };
        gracefulFs = pkgs.fetchurl {
          url = "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz";
          hash = "sha256-OWE3SqFh5v7YDW9Laq8vt+r9LJ5b406GWzdfARTdCZw=";
        };
        grokMermaid = pkgs.fetchurl {
          url = "https://registry.npmjs.org/grok-mermaid/-/grok-mermaid-0.2.3.tgz";
          hash = "sha256-QdAgY/UyYf6GmsttoLAYONbs4JXXOnBjZFzgRC8NjIg=";
        };
        highlightJs = pkgs.fetchurl {
          url = "https://registry.npmjs.org/highlight.js/-/highlight.js-10.7.3.tgz";
          hash = "sha256-KSlowx0Qb5EP3S5Nc6mNm99iHl9uAkTZ8/v8NXK+qR4=";
        };
        hostedGitInfo = pkgs.fetchurl {
          url = "https://registry.npmjs.org/hosted-git-info/-/hosted-git-info-9.0.3.tgz";
          hash = "sha256-tboc+lk/YmLEgsLLNNVwOp8YeymqqvHcBFUD69rOtnM=";
        };
        httpsProxyAgent = pkgs.fetchurl {
          url = "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-7.0.6.tgz";
          hash = "sha256-lg+J6OUkCIL2QknQSlOEId051i/6zBOFRGR8wyUbwOA=";
        };
        ignore = pkgs.fetchurl {
          url = "https://registry.npmjs.org/ignore/-/ignore-7.0.8.tgz";
          hash = "sha256-RWxIgt7g1D+cdd4qPnfx9ayLa+Vbu54MVr0AvVMdPDw=";
        };
        isexe = pkgs.fetchurl {
          url = "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz";
          hash = "sha256-R8/ocuCI4oxTtzb+8wUyS1fMHPyfcqmw92n5JzHLg1k=";
        };
        jiti = pkgs.fetchurl {
          url = "https://registry.npmjs.org/jiti/-/jiti-2.7.0.tgz";
          hash = "sha256-jdDTZftJwOfMQtagDfb7LakFb8JEkglDRvw07NvPKMo=";
        };
        jsonBigint = pkgs.fetchurl {
          url = "https://registry.npmjs.org/json-bigint/-/json-bigint-1.0.0.tgz";
          hash = "sha256-TE9QKVPPs2z+HGxJiWdr+bdomaJTI3/AIggUuI/5A7Y=";
        };
        jwa = pkgs.fetchurl {
          url = "https://registry.npmjs.org/jwa/-/jwa-2.0.1.tgz";
          hash = "sha256-yLwM+fu9ydLxtvP5ernB9wEw7saxU/Kf1puqWmqoNB0=";
        };
        jws = pkgs.fetchurl {
          url = "https://registry.npmjs.org/jws/-/jws-4.0.1.tgz";
          hash = "sha256-7TpfsCf4zhAGyOMKN+iOfNSYJNSHPvyodlMEsg/pLhI=";
        };
        lruCache = pkgs.fetchurl {
          url = "https://registry.npmjs.org/lru-cache/-/lru-cache-11.5.3.tgz";
          hash = "sha256-0Yc5u9fQCR0w0syljhIMi3CsCaWiGqSys+mvstxAhNg=";
        };
        marked = pkgs.fetchurl {
          url = "https://registry.npmjs.org/marked/-/marked-18.0.11.tgz";
          hash = "sha256-zvVUdsdVHnPhqJEY+mn+6ffu+ZYOnHdK0mbiLulmuZQ=";
        };
        minimatch = pkgs.fetchurl {
          url = "https://registry.npmjs.org/minimatch/-/minimatch-10.2.6.tgz";
          hash = "sha256-Wj0sgHSigilmVyfke4oQkJQYVqeWKQXv4F0g03YDVfg=";
        };
        ms = pkgs.fetchurl {
          url = "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz";
          hash = "sha256-9mFuFeUw7VUvnaotPOcZY5R8a8fJjJtk/T5nP9AmIsY=";
        };
        openai = pkgs.fetchurl {
          url = "https://registry.npmjs.org/openai/-/openai-7.19.0.tgz";
          hash = "sha256-WXUy3LkFHuiqXtre21e3mLQq3WjMWuwdZ+mU0M+tB/E=";
        };
        pRetry = pkgs.fetchurl {
          url = "https://registry.npmjs.org/p-retry/-/p-retry-4.6.2.tgz";
          hash = "sha256-IRErtITeMSDp6F8evmpmEl7P2kgHKuSLDSAmkzN/tVg=";
        };
        partialJson = pkgs.fetchurl {
          url = "https://registry.npmjs.org/partial-json/-/partial-json-0.1.7.tgz";
          hash = "sha256-MOr+7W/cJfssok80w3eW2fmPC/XhVkUrmKLDVnYvYyI=";
        };
        pathKey = pkgs.fetchurl {
          url = "https://registry.npmjs.org/path-key/-/path-key-3.1.1.tgz";
          hash = "sha256-S4mZrLkUgw7c08W4/sYysyxrx1msPtyGM29angi6e5I=";
        };
        properLockfile = pkgs.fetchurl {
          url = "https://registry.npmjs.org/proper-lockfile/-/proper-lockfile-4.1.2.tgz";
          hash = "sha256-/XiRS6V8rsvtu5KPs2lRCwH6MuHA+8p7Y8oWYjp6iWg=";
        };
        quickjsWasi = pkgs.fetchurl {
          url = "https://registry.npmjs.org/quickjs-wasi/-/quickjs-wasi-3.6.2.tgz";
          hash = "sha256-8fQ0nxmi2EnjPqCum+wucGK4g59OzrF8kFHduqJyCYI=";
        };
        react = pkgs.fetchurl {
          url = "https://registry.npmjs.org/react/-/react-19.3.1.tgz";
          hash = "sha256-VpNpE5GNzx96b+WHhOed9UsYIAqIZVzoCc9enE74cao=";
        };
        # @openuidev/react-lang reaches for react-dom (and react-dom for a
        # newer scheduler than the one react-reconciler holds, so scheduler is
        # nested under react-dom below).
        reactDom = pkgs.fetchurl {
          url = "https://registry.npmjs.org/react-dom/-/react-dom-19.3.1.tgz";
          hash = "sha256-i0mXWCHuxjEeANKz9LgzeSMlPIdlFziKM/mDnGGrJi4=";
        };
        reactReconciler = pkgs.fetchurl {
          url = "https://registry.npmjs.org/react-reconciler/-/react-reconciler-0.31.0.tgz";
          hash = "sha256-n0GsUyE/9s+ri+YM6iUTVyiToVsOl2xj9CVxqXtJQyM=";
        };
        retry0120 = pkgs.fetchurl {
          url = "https://registry.npmjs.org/retry/-/retry-0.12.0.tgz";
          hash = "sha256-32HG0Zeq3Gqxe0iRA1M7uwIjQTVY1CIkEcFiFVwwtCg=";
        };
        retry0131 = pkgs.fetchurl {
          url = "https://registry.npmjs.org/retry/-/retry-0.13.1.tgz";
          hash = "sha256-dSHYRF6EVHXoiMy3r0c8SvsXqrr+/jWiM3GoqMebgIQ=";
        };
        safeBuffer = pkgs.fetchurl {
          url = "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz";
          hash = "sha256-XRgYBFFsSmk6OEJyp70OQtF+DUswHM++QIZpzK/cs+g=";
        };
        scheduler = pkgs.fetchurl {
          url = "https://registry.npmjs.org/scheduler/-/scheduler-0.25.0.tgz";
          hash = "sha256-iqwtpt7LCcHaz4wQb2LS+0RU+7H98vb+bU7xpXt8aRQ=";
        };
        scheduler0280 = pkgs.fetchurl {
          url = "https://registry.npmjs.org/scheduler/-/scheduler-0.28.0.tgz";
          hash = "sha256-MCmV1ZDjwKEe60DR0PKZwd8YABNdWZ2FzdX662FPMtY=";
        };
        semver = pkgs.fetchurl {
          url = "https://registry.npmjs.org/semver/-/semver-7.8.5.tgz";
          hash = "sha256-2FBF1DANfVfIkTNrld9TLnPzTCL/zSIkUrbQi50SfV0=";
        };
        shebangCommand = pkgs.fetchurl {
          url = "https://registry.npmjs.org/shebang-command/-/shebang-command-2.0.0.tgz";
          hash = "sha256-msulvRilHpzfWJg4Dk32P4A+GETe9krhpG+Iz/htVW4=";
        };
        shebangRegex = pkgs.fetchurl {
          url = "https://registry.npmjs.org/shebang-regex/-/shebang-regex-3.0.0.tgz";
          hash = "sha256-/turqm2ybGvgGD+Cd336hS1Zpi+Ihd6TvTLrwodYlY8=";
        };
        signalExit = pkgs.fetchurl {
          url = "https://registry.npmjs.org/signal-exit/-/signal-exit-3.0.7.tgz";
          hash = "sha256-Q5Yj+mqrkWAGFex1fqoTf8q0DTs13aON90RMFWePIKg=";
        };
        standardwebhooks = pkgs.fetchurl {
          url = "https://registry.npmjs.org/standardwebhooks/-/standardwebhooks-1.1.1.tgz";
          hash = "sha256-0LyP7CgMnjDqPLyHb0T+cdVvRDrsor0r33RXGDCNSu0=";
        };
        typebox = pkgs.fetchurl {
          url = "https://registry.npmjs.org/typebox/-/typebox-1.3.27.tgz";
          hash = "sha256-WiiLzT1o9EVn3oSxheBNIF731bU2AoRrw9sw/dIZ3aM=";
        };
        # Guardrails: the tree-sitter core and the prebuilt grammars. The
        # grammars must carry a `dylink.0` custom section, which only
        # @vscode/tree-sitter-wasm's build ships (the prebuilt tree-sitter-wasms
        # set carries the older `dylink` and is refused by the core).
        vscodeTreeSitterWasm = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@vscode/tree-sitter-wasm/-/tree-sitter-wasm-0.3.1.tgz";
          hash = "sha256-mFaEss++Xo+QSZqfNuN1GYh8fU4ml9BFfQ8ekjzlGEw=";
        };
        webTreeSitter = pkgs.fetchurl {
          url = "https://registry.npmjs.org/web-tree-sitter/-/web-tree-sitter-0.27.2.tgz";
          hash = "sha256-Cx0bLtzBR2x7FxCipFie75ypz0YbqlD4mVbVdTCWQ2I=";
        };
        which = pkgs.fetchurl {
          url = "https://registry.npmjs.org/which/-/which-2.0.2.tgz";
          hash = "sha256-oTrfX93rdpZV7c5VHoH7sRkEucm+dtleQdqMTEmdTtw=";
        };
        yaml = pkgs.fetchurl {
          url = "https://registry.npmjs.org/yaml/-/yaml-2.9.0.tgz";
          hash = "sha256-AI+iBMsbpwDgJyugRau/Cab/5jRW6BRrqXysbCrR75E=";
        };
        zod = pkgs.fetchurl {
          url = "https://registry.npmjs.org/zod/-/zod-4.6.7.tgz";
          hash = "sha256-hO/RVb7ZMnAobnk/yVG+JwtTbL1bDusRHw+jlnIB1pg=";
        };
      };
    in
    {
      packages.${system}.default =
        pkgs.stdenvNoCC.mkDerivation {
          pname = "mu";
          version = "0.1.0";

          inherit src;

          nativeBuildInputs = [ pkgs.bun pkgs.makeBinaryWrapper ];

          # Runtime shared-library deps of the embedded @gpuix/native .node.
          propagatedBuildInputs = [
            pkgs.libxkbcommon
            pkgs.wayland
            pkgs.mesa
            pkgs.vulkan-loader
          ];

          dontBuild = true;

          meta = {
            description = "GPUix desktop app for the pi coding agent";
            mainProgram = "mu";
            # @gpuix/native-linux-x64-gnu is the only prebuilt native lib.
            platforms = [ system ];
          };

          installPhase = ''
            mkdir -p $out/bin $out/lib

            # Drop the source's local node_modules; assemble a fresh one.
            rm -rf node_modules
            mkdir -p node_modules

            # adwaita-gpuix: source-only, copied in as-is.
            cp -r ${adwaitaSrc} node_modules/adwaita-gpuix

            # npm deps (direct + transitive): untar the prefetched tarballs.
            mkdir -p node_modules/@anthropic-ai/sdk && tar xzf ${npmDeps.anthropicAiSdk} -C node_modules/@anthropic-ai/sdk --strip-components=1
            mkdir -p node_modules/@earendil-works/pi-agent-core && tar xzf ${npmDeps.earendilWorksPiAgentCore} -C node_modules/@earendil-works/pi-agent-core --strip-components=1
            mkdir -p node_modules/@earendil-works/pi-ai && tar xzf ${npmDeps.earendilWorksPiAi} -C node_modules/@earendil-works/pi-ai --strip-components=1
            mkdir -p node_modules/@earendil-works/pi-codemode && tar xzf ${npmDeps.earendilWorksPiCodemode} -C node_modules/@earendil-works/pi-codemode --strip-components=1
            mkdir -p node_modules/@earendil-works/pi-coding-agent && tar xzf ${npmDeps.earendilWorksPiCodingAgent} -C node_modules/@earendil-works/pi-coding-agent --strip-components=1
            mkdir -p node_modules/@earendil-works/pi-mcp && tar xzf ${npmDeps.earendilWorksPiMcp} -C node_modules/@earendil-works/pi-mcp --strip-components=1
            mkdir -p node_modules/@earendil-works/pi-tui && tar xzf ${npmDeps.earendilWorksPiTui} -C node_modules/@earendil-works/pi-tui --strip-components=1
            mkdir -p node_modules/@google/genai && tar xzf ${npmDeps.googleGenai} -C node_modules/@google/genai --strip-components=1
            mkdir -p node_modules/@gpuix/native && tar xzf ${npmDeps.gpuixNative} -C node_modules/@gpuix/native --strip-components=1
            mkdir -p node_modules/@gpuix/native-linux-x64-gnu && tar xzf ${npmDeps.gpuixNativeLinuxX64Gnu} -C node_modules/@gpuix/native-linux-x64-gnu --strip-components=1
            mkdir -p node_modules/@gpuix/react && tar xzf ${npmDeps.gpuixReact} -C node_modules/@gpuix/react --strip-components=1
            mkdir -p node_modules/@iconify-json/material-symbols && tar xzf ${npmDeps.iconifyJsonMaterialSymbols} -C node_modules/@iconify-json/material-symbols --strip-components=1
            mkdir -p node_modules/@openuidev/devtools && tar xzf ${npmDeps.openuiDevtools} -C node_modules/@openuidev/devtools --strip-components=1
            mkdir -p node_modules/@openuidev/lang-core && tar xzf ${npmDeps.openuiLangCore} -C node_modules/@openuidev/lang-core --strip-components=1
            mkdir -p node_modules/@openuidev/observability && tar xzf ${npmDeps.openuiObservability} -C node_modules/@openuidev/observability --strip-components=1
            mkdir -p node_modules/@openuidev/react-lang && tar xzf ${npmDeps.openuiReactLang} -C node_modules/@openuidev/react-lang --strip-components=1
            mkdir -p node_modules/@silvia-odwyer/photon-node && tar xzf ${npmDeps.silviaOdwyerPhotonNode} -C node_modules/@silvia-odwyer/photon-node --strip-components=1
            mkdir -p node_modules/@stablelib/base64 && tar xzf ${npmDeps.stablelibBase64} -C node_modules/@stablelib/base64 --strip-components=1
            mkdir -p node_modules/@vscode/tree-sitter-wasm && tar xzf ${npmDeps.vscodeTreeSitterWasm} -C node_modules/@vscode/tree-sitter-wasm --strip-components=1
            mkdir -p node_modules/agent-base && tar xzf ${npmDeps.agentBase} -C node_modules/agent-base --strip-components=1
            mkdir -p node_modules/balanced-match && tar xzf ${npmDeps.balancedMatch} -C node_modules/balanced-match --strip-components=1
            mkdir -p node_modules/base64-js && tar xzf ${npmDeps.base64Js} -C node_modules/base64-js --strip-components=1
            mkdir -p node_modules/bignumber.js && tar xzf ${npmDeps.bignumberJs} -C node_modules/bignumber.js --strip-components=1
            mkdir -p node_modules/brace-expansion && tar xzf ${npmDeps.braceExpansion} -C node_modules/brace-expansion --strip-components=1
            mkdir -p node_modules/buffer-equal-constant-time && tar xzf ${npmDeps.bufferEqualConstantTime} -C node_modules/buffer-equal-constant-time --strip-components=1
            mkdir -p node_modules/chalk && tar xzf ${npmDeps.chalk} -C node_modules/chalk --strip-components=1
            mkdir -p node_modules/ci-info && tar xzf ${npmDeps.ciInfo} -C node_modules/ci-info --strip-components=1
            mkdir -p node_modules/cross-spawn && tar xzf ${npmDeps.crossSpawn} -C node_modules/cross-spawn --strip-components=1
            mkdir -p node_modules/debug && tar xzf ${npmDeps.debug} -C node_modules/debug --strip-components=1
            mkdir -p node_modules/diff && tar xzf ${npmDeps.diff} -C node_modules/diff --strip-components=1
            mkdir -p node_modules/ecdsa-sig-formatter && tar xzf ${npmDeps.ecdsaSigFormatter} -C node_modules/ecdsa-sig-formatter --strip-components=1
            mkdir -p node_modules/eventsource-parser && tar xzf ${npmDeps.eventsourceParser} -C node_modules/eventsource-parser --strip-components=1
            mkdir -p node_modules/extend && tar xzf ${npmDeps.extend} -C node_modules/extend --strip-components=1
            mkdir -p node_modules/fast-sha256 && tar xzf ${npmDeps.fastSha256} -C node_modules/fast-sha256 --strip-components=1
            mkdir -p node_modules/gaxios && tar xzf ${npmDeps.gaxios} -C node_modules/gaxios --strip-components=1
            mkdir -p node_modules/gcp-metadata && tar xzf ${npmDeps.gcpMetadata} -C node_modules/gcp-metadata --strip-components=1
            mkdir -p node_modules/get-east-asian-width && tar xzf ${npmDeps.getEastAsianWidth} -C node_modules/get-east-asian-width --strip-components=1
            mkdir -p node_modules/google-auth-library && tar xzf ${npmDeps.googleAuthLibrary} -C node_modules/google-auth-library --strip-components=1
            mkdir -p node_modules/google-auth-library/node_modules/google-logging-utils && tar xzf ${npmDeps.googleLoggingUtils113} -C node_modules/google-auth-library/node_modules/google-logging-utils --strip-components=1
            mkdir -p node_modules/google-logging-utils && tar xzf ${npmDeps.googleLoggingUtils120} -C node_modules/google-logging-utils --strip-components=1
            mkdir -p node_modules/graceful-fs && tar xzf ${npmDeps.gracefulFs} -C node_modules/graceful-fs --strip-components=1
            mkdir -p node_modules/grok-mermaid && tar xzf ${npmDeps.grokMermaid} -C node_modules/grok-mermaid --strip-components=1
            mkdir -p node_modules/highlight.js && tar xzf ${npmDeps.highlightJs} -C node_modules/highlight.js --strip-components=1
            mkdir -p node_modules/hosted-git-info && tar xzf ${npmDeps.hostedGitInfo} -C node_modules/hosted-git-info --strip-components=1
            mkdir -p node_modules/https-proxy-agent && tar xzf ${npmDeps.httpsProxyAgent} -C node_modules/https-proxy-agent --strip-components=1
            mkdir -p node_modules/ignore && tar xzf ${npmDeps.ignore} -C node_modules/ignore --strip-components=1
            mkdir -p node_modules/isexe && tar xzf ${npmDeps.isexe} -C node_modules/isexe --strip-components=1
            mkdir -p node_modules/jiti && tar xzf ${npmDeps.jiti} -C node_modules/jiti --strip-components=1
            mkdir -p node_modules/json-bigint && tar xzf ${npmDeps.jsonBigint} -C node_modules/json-bigint --strip-components=1
            mkdir -p node_modules/jwa && tar xzf ${npmDeps.jwa} -C node_modules/jwa --strip-components=1
            mkdir -p node_modules/jws && tar xzf ${npmDeps.jws} -C node_modules/jws --strip-components=1
            mkdir -p node_modules/lru-cache && tar xzf ${npmDeps.lruCache} -C node_modules/lru-cache --strip-components=1
            mkdir -p node_modules/marked && tar xzf ${npmDeps.marked} -C node_modules/marked --strip-components=1
            mkdir -p node_modules/minimatch && tar xzf ${npmDeps.minimatch} -C node_modules/minimatch --strip-components=1
            mkdir -p node_modules/ms && tar xzf ${npmDeps.ms} -C node_modules/ms --strip-components=1
            mkdir -p node_modules/openai && tar xzf ${npmDeps.openai} -C node_modules/openai --strip-components=1
            mkdir -p node_modules/p-retry && tar xzf ${npmDeps.pRetry} -C node_modules/p-retry --strip-components=1
            mkdir -p node_modules/partial-json && tar xzf ${npmDeps.partialJson} -C node_modules/partial-json --strip-components=1
            mkdir -p node_modules/path-key && tar xzf ${npmDeps.pathKey} -C node_modules/path-key --strip-components=1
            mkdir -p node_modules/proper-lockfile && tar xzf ${npmDeps.properLockfile} -C node_modules/proper-lockfile --strip-components=1
            mkdir -p node_modules/quickjs-wasi && tar xzf ${npmDeps.quickjsWasi} -C node_modules/quickjs-wasi --strip-components=1
            mkdir -p node_modules/react && tar xzf ${npmDeps.react} -C node_modules/react --strip-components=1
            mkdir -p node_modules/react-dom && tar xzf ${npmDeps.reactDom} -C node_modules/react-dom --strip-components=1
            mkdir -p node_modules/react-dom/node_modules/scheduler && tar xzf ${npmDeps.scheduler0280} -C node_modules/react-dom/node_modules/scheduler --strip-components=1
            mkdir -p node_modules/react-reconciler && tar xzf ${npmDeps.reactReconciler} -C node_modules/react-reconciler --strip-components=1
            mkdir -p node_modules/proper-lockfile/node_modules/retry && tar xzf ${npmDeps.retry0120} -C node_modules/proper-lockfile/node_modules/retry --strip-components=1
            mkdir -p node_modules/retry && tar xzf ${npmDeps.retry0131} -C node_modules/retry --strip-components=1
            mkdir -p node_modules/safe-buffer && tar xzf ${npmDeps.safeBuffer} -C node_modules/safe-buffer --strip-components=1
            mkdir -p node_modules/scheduler && tar xzf ${npmDeps.scheduler} -C node_modules/scheduler --strip-components=1
            mkdir -p node_modules/semver && tar xzf ${npmDeps.semver} -C node_modules/semver --strip-components=1
            mkdir -p node_modules/shebang-command && tar xzf ${npmDeps.shebangCommand} -C node_modules/shebang-command --strip-components=1
            mkdir -p node_modules/shebang-regex && tar xzf ${npmDeps.shebangRegex} -C node_modules/shebang-regex --strip-components=1
            mkdir -p node_modules/signal-exit && tar xzf ${npmDeps.signalExit} -C node_modules/signal-exit --strip-components=1
            mkdir -p node_modules/standardwebhooks && tar xzf ${npmDeps.standardwebhooks} -C node_modules/standardwebhooks --strip-components=1
            mkdir -p node_modules/typebox && tar xzf ${npmDeps.typebox} -C node_modules/typebox --strip-components=1
            mkdir -p node_modules/web-tree-sitter && tar xzf ${npmDeps.webTreeSitter} -C node_modules/web-tree-sitter --strip-components=1
            mkdir -p node_modules/which && tar xzf ${npmDeps.which} -C node_modules/which --strip-components=1
            mkdir -p node_modules/yaml && tar xzf ${npmDeps.yaml} -C node_modules/yaml --strip-components=1
            mkdir -p node_modules/zod && tar xzf ${npmDeps.zod} -C node_modules/zod --strip-components=1

            # codemode's worker is a second entrypoint, not an import: in a
            # bun --compile binary pi spawns it at the literal path
            # ./src/extensions/codemode/worker.ts (resolveCodemodeWorkerSpecifier
            # in dist/config.js), and a compiled executable can only start a
            # worker it embedded as an entrypoint. The shim sits at that path in
            # mu's tree — pi's path, so it cannot move — and `bun dev` needs it
            # there too, which is why @earendil-works/pi-codemode is a direct
            # dependency.
            bun build --compile app.tsx ./src/extensions/codemode/worker.ts \
              --outfile $out/lib/mu

            # A bun --compile binary cannot resolve the NAPI-RS platform
            # package from disk, so ship the .node beside the binary and point
            # the loader at it.
            mkdir -p $out/lib/mu-native
            cp node_modules/@gpuix/native-linux-x64-gnu/gpuix-native.linux-x64-gnu.node \
              $out/lib/mu-native/

            # Photon (pi's image resizer) is bundled as JS only: its glue reads
            # photon_rs_bg.wasm with fs.readFileSync(__dirname + "/photon_rs_bg.wasm"),
            # so a bun --compile binary asks the build directory for it and gets
            # ENOENT. pi's loader then falls back to dirname(process.execPath),
            # so ship the wasm beside the binary — the same thing pi's own
            # release does next to dist/pi. Without it every image read answers
            # "could not be resized below the inline image size limit".
            cp node_modules/@silvia-odwyer/photon-node/photon_rs_bg.wasm $out/lib/

            # QuickJS is the VM codemode scripts run in, and pi reads its wasm
            # off disk. pi's own bun entry embeds the file and passes pi the path;
            # that setter is not exported, so a third-party binary falls back to
            # require.resolve("quickjs-wasi/quickjs.wasm"), which inside a compiled
            # executable searches NODE_PATH and the process cwd — never the
            # executable's directory. Ship the wasm under lib/node_modules and
            # point NODE_PATH at it from the wrapper, so codemode works however mu
            # is launched (from a desktop entry the cwd is the home directory).
            mkdir -p $out/lib/node_modules/quickjs-wasi
            cp node_modules/quickjs-wasi/package.json \
              node_modules/quickjs-wasi/quickjs.wasm \
              $out/lib/node_modules/quickjs-wasi/

            # XDG icon and desktop entry: the scalable mark (μι) and the
            # generated .desktop file, in the hicolor layout a desktop
            # environment scans out of $XDG_DATA_DIRS.
            mkdir -p $out/share/icons/hicolor/scalable/apps
            cp assets/net.knoopx.mu.svg $out/share/icons/hicolor/scalable/apps/
            cp -r ${desktopEntry}/share/applications $out/share/applications

            # bun --compile emits a raw ELF; wrap it with the runtime library
            # path (libxkbcommon + the dlopened wayland/EGL/Vulkan libraries),
            # the native binding path, and this package's share dir so the icon
            # and desktop entry resolve when the binary runs from a shell.
            makeWrapper $out/lib/mu $out/bin/mu \
              --set LD_LIBRARY_PATH "${libs}" \
              --set NAPI_RS_NATIVE_LIBRARY_PATH "$out/lib/mu-native/gpuix-native.linux-x64-gnu.node" \
              --set NODE_PATH "$out/lib/node_modules" \
              --prefix XDG_DATA_DIRS : "$out/share"
          '';
        };

      apps.${system}.default = {
        type = "app";
        program = "${self.packages.${system}.default}/bin/mu";
      };

      # mkShell puts packages bin dirs on PATH only; the .node dlopen needs the
      # library path set explicitly (as the package wrapper does), so that
      # bun dev works inside nix develop.
      devShells.${system}.default = pkgs.mkShell {
        packages = [ pkgs.bun ];
        LD_LIBRARY_PATH = libs;
      };
    };
}
