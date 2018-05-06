const nodelua = require('../../index');

var lua = new nodelua.LuaState();

/**
 * On enregistre une nouvelle fonction utilisable dans lua
 */

lua.RegisterFunction('add', function() {
	var a = lua.ToValue(1);
	var b = lua.ToValue(2);
	lua.Pop(2);
	lua.Push(a + b);
	return 1;
});

lua.DoString("print('Result in Lua: ' .. add(10, 5))");

lua.DoFile(__dirname + "/test.lua");



/**
 * Set / Get of a global lua variable
 */

lua.Push(5);
lua.SetGlobal('myVar');

lua.GetGlobal('myVar');
var myVar = lua.ToValue(-1);
console.log(myVar);

console.log("Lua.GetTop: " + lua.GetTop());
// Don't forget to pop the values so that your stack stays clean
lua.Pop();

console.log("Lua.GetTop: " + lua.GetTop());



/**
 * Access object data
 */

lua.DoString("a = {}; a.t = 42;");

lua.GetField(nodelua.LUA.GLOBALSINDEX, "a"); // the same as lua.GetGlobal("a");
lua.GetField(-1, "t");
var t = lua.ToValue(-1);
lua.Pop(2);

console.log(t);


/**
 * Function call
 */

lua.DoString("function test(a, b) print('hello ' .. a .. ', hello' .. b) end");

lua.GetGlobal("test");
lua.Push("1");
lua.Push("2");
lua.Call(2, 0);
lua.Pop(2);
