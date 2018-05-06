const nodelua = require('../../index');

var lua = new nodelua.LuaState();

lua.AddPackagePath(__dirname + "/lua");

lua.DoFile(__dirname + "/file.lua");
