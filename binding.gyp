{
  "targets": [
    {
      "target_name": "speex",
      "sources": [
        "src/resampler.cc",
        "deps/speex/resample.c"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<(module_root_dir)/deps/speex"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "FLOATING_POINT",
        "EXPORT="
    ],
      "cflags_cc!": [ "-fno-exceptions" ]
    }
  ]
}
