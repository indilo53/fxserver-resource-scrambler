{
  "targets": [
    {
      "target_name": "nodelua",
      "variables": {
        "lua_include": "",
        "lib_dirs": ""
      },
      "conditions": [
        [
          "OS=='win'",
          {
            "include_dirs": [
              "./win64luajit"
            ],
            "library_dirs": [
              "./win64luajit"
            ],
            "libraries": [
              "lua51.lib"
            ],
            "actions": [
              {
                'action_name': 'move_lua',
                'inputs': [
                  '<(module_root_dir)/win64luajit/lua51.dll'
                ],
                'outputs': [
                  '<(module_root_dir)/build/Release/lua51.dll'
                ],
                'action': [
                  'cp',
                  '<(module_root_dir)/win64luajit/lua51.dll',
                  '<(module_root_dir)/build/Release/lua51.dll'
                ]
              }
            ],
          }
        ],
        [
          'OS=="mac"',
          {
            "include_dirs": [
              "./maclualib/include"
            ],
            "libraries": [
              "../maclualib/lib/liblua.a"
            ],
            "actions": [],
            "cflags": [
              "-std=c++11",
              "-stdlib=libc++"
            ],
            "xcode_settings": {
              "CLANG_CXX_LANGUAGE_STANDARD": "c++0x",
              "CLANG_CXX_LIBRARY": "libc++"
            }
          }
        ],
        [
          'OS=="linux"',
          {
            "include_dirs": [
              "<!(find /usr/include /usr/local/include $NODELUA_INCLUDE -name lua.h | sed s/lua.h//)"
            ],
            "library_dirs": [
              "/usr/local/lib"
            ],
            "libraries": [
              "/usr/local/lib/libluajit-5.1.so"
            ],
            "actions": []
          }
        ]
      ],
      "sources": [
        "src/utils.cc",
        "src/luastate.cc",
		"src/nodelua.cc"
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")"
      ]
    }
  ]
}
