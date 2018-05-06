#ifndef LUASTATE_H
#define LUASTATE_H

#include <map>
#include <node.h>

#include "utils.h"
#include <nan.h>
#include <v8.h>

extern "C" {
	#include <lua.h>
	#include <lauxlib.h>
	#include <lualib.h>
}

class LuaState : public Nan::ObjectWrap {
private:
	static Nan::Persistent<v8::Function> constructor;
	static LuaState* instance;

	std::map<char*, Nan::Persistent<v8::Function> > functions;
	lua_State* lua_;

public:
	static void Init(v8::Local<v8::Object> exports);
	static int CallFunction(lua_State* L);

	static LuaState* getCurrentInstance();
	static void setCurrentInstance(LuaState*);

 private:
	LuaState();
	~LuaState();

	static void New(const Nan::FunctionCallbackInfo<v8::Value>& info);
	static void Close(const Nan::FunctionCallbackInfo<v8::Value>& info);

	static void CollectGarbageSync(const Nan::FunctionCallbackInfo<v8::Value>& info);
	static void StatusSync(const Nan::FunctionCallbackInfo<v8::Value>& info);

	static void AddPackagePath(const Nan::FunctionCallbackInfo<v8::Value>& info);

	static void LoadFileSync(const Nan::FunctionCallbackInfo<v8::Value>& info);
	static void LoadStringSync(const Nan::FunctionCallbackInfo<v8::Value>& info);

	static void DoFileSync(const Nan::FunctionCallbackInfo<v8::Value>& info);
	static void DoStringSync(const Nan::FunctionCallbackInfo<v8::Value>& info);

	static void SetGlobal(const Nan::FunctionCallbackInfo<v8::Value>& info);
	static void GetGlobal(const Nan::FunctionCallbackInfo<v8::Value>& info);

	static void SetField(const Nan::FunctionCallbackInfo<v8::Value>& info);
	static void GetField(const Nan::FunctionCallbackInfo<v8::Value>& info);

	static void ToValue(const Nan::FunctionCallbackInfo<v8::Value>& info);
	static void Call(const Nan::FunctionCallbackInfo<v8::Value>& info);

	static void LuaYield(const Nan::FunctionCallbackInfo<v8::Value>& info);
	static void LuaResume(const Nan::FunctionCallbackInfo<v8::Value>& info);

	static void RegisterFunction(const Nan::FunctionCallbackInfo<v8::Value>& info);

	static void Push(const Nan::FunctionCallbackInfo<v8::Value>& info);
	static void Pop(const Nan::FunctionCallbackInfo<v8::Value>& info);
	static void GetTop(const Nan::FunctionCallbackInfo<v8::Value>& info);
	static void SetTop(const Nan::FunctionCallbackInfo<v8::Value>& info);
	static void Replace(const Nan::FunctionCallbackInfo<v8::Value>& info);
};

#endif
