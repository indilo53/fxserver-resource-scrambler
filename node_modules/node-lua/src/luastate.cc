#define BUILDING_NODELUA

#include <algorithm>
#include <string>

#include "luastate.h"
#include <nan.h>
#include <v8.h>

using v8::Function;
using v8::Local;
using v8::Number;
using v8::String;
using v8::Value;
using Nan::HandleScope;
using Nan::New;
using Nan::Null;
using Nan::To;

LuaState::LuaState() {}
LuaState::~LuaState() {}

Nan::Persistent<v8::Function> LuaState::constructor;

LuaState* LuaState::instance = 0;
LuaState* LuaState::getCurrentInstance() {
	return LuaState::instance;
}
void LuaState::setCurrentInstance(LuaState* instance) {
	LuaState::instance = instance;
}

void LuaState::Init(v8::Local<v8::Object> exports) {

	Nan::HandleScope scope;

	// Prepare constructor template
	v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
	tpl->SetClassName(Nan::New("LuaState").ToLocalChecked());
	tpl->InstanceTemplate()->SetInternalFieldCount(1);

	// Prototype

	Nan::SetPrototypeMethod(tpl, "LoadFile", DoFileSync);
	Nan::SetPrototypeMethod(tpl, "LoadString", DoStringSync);

	Nan::SetPrototypeMethod(tpl, "AddPackagePath", AddPackagePath);

	Nan::SetPrototypeMethod(tpl, "DoFile", DoFileSync);
	Nan::SetPrototypeMethod(tpl, "DoString", DoStringSync);

	Nan::SetPrototypeMethod(tpl, "Status", StatusSync);
	Nan::SetPrototypeMethod(tpl, "CollectGarbage", CollectGarbageSync);

	Nan::SetPrototypeMethod(tpl, "SetGlobal", SetGlobal);
	Nan::SetPrototypeMethod(tpl, "GetGlobal", GetGlobal);

	Nan::SetPrototypeMethod(tpl, "SetField", SetField);
	Nan::SetPrototypeMethod(tpl, "GetField", GetField);

	Nan::SetPrototypeMethod(tpl, "ToValue", ToValue);
	Nan::SetPrototypeMethod(tpl, "Call", Call);

	Nan::SetPrototypeMethod(tpl, "Yield", LuaYield);
	Nan::SetPrototypeMethod(tpl, "Resume", LuaResume);

	Nan::SetPrototypeMethod(tpl, "Close", Close);

	Nan::SetPrototypeMethod(tpl, "RegisterFunction", RegisterFunction);

	Nan::SetPrototypeMethod(tpl, "Push", Push);
	Nan::SetPrototypeMethod(tpl, "Pop", Pop);
	Nan::SetPrototypeMethod(tpl, "GetTop", GetTop);
	Nan::SetPrototypeMethod(tpl, "SetTop", SetTop);
	Nan::SetPrototypeMethod(tpl, "Replace", Replace);

	constructor.Reset(tpl->GetFunction());
	exports->Set(Nan::New("LuaState").ToLocalChecked(), tpl->GetFunction());
}

void LuaState::New(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	if(!info.IsConstructCall()) {
		Nan::ThrowTypeError("LuaState Requires The 'new' Operator To Create An Instance");
		return;
	}

	LuaState* obj = new LuaState();
	obj->lua_ = lua_open();
	luaL_openlibs(obj->lua_);
	obj->Wrap(info.This());

    info.GetReturnValue().Set(info.This());
}

int LuaState::CallFunction(lua_State* L){

	char *func_name = (char *)lua_tostring(L, lua_upvalueindex(1));

	v8::Local<v8::Value> ret_val = Nan::Undefined();

	if (LuaState::getCurrentInstance()) {
		LuaState *self = LuaState::getCurrentInstance();
		lua_State *mainL = self->lua_;
		self->lua_ = L;

		const unsigned argc = 0;
		Local<Value>* argv = new Local<Value>[0];

		std::map<char *, Nan::Persistent<v8::Function> >::iterator iter;
		for(iter = self->functions.begin(); iter != self->functions.end(); iter++) {
			if(strcmp(iter->first, func_name) == 0) {
				v8::Local<v8::Function> func = Nan::New(iter->second);
				ret_val = Nan::MakeCallback(Nan::GetCurrentContext()->Global(), func, argc, argv);
				break;
			}
		}

		self->lua_ = mainL;
	}

	int args = 0;
	if (ret_val->IsNumber()) {
		args = Nan::To<int32_t>(ret_val).FromMaybe(0);
	}
	return args;
}

void LuaState::RegisterFunction(const Nan::FunctionCallbackInfo<v8::Value>& info){
	Nan::HandleScope scope;

	if(info.Length() < 1){
		Nan::ThrowTypeError("LuaState.RegisterFunction Must Have 2 Arguments");
        return;
	}

	if(!info[0]->IsString()){
		Nan::ThrowTypeError("LuaState.RegisterFunction Argument 1 Must Be A String");
		return;
	}

	if(!info[1]->IsFunction()){
		Nan::ThrowTypeError("LuaState.RegisterFunction Argument 2 Must Be A Function");
		return;
	}

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	LuaState::setCurrentInstance(obj);
	lua_State* L = obj->lua_;

	char* func_name = get_str(info[0]);
	Nan::Persistent<v8::Function> func(Local<v8::Function>::Cast(info[1]));
	obj->functions[func_name].Reset(func);

	lua_pushstring(L, func_name);
	lua_pushcclosure(L, CallFunction, 1);
	lua_setglobal(L, func_name);

	LuaState::setCurrentInstance(0);
	info.GetReturnValue().Set(Nan::Undefined());
}

void LuaState::AddPackagePath(const Nan::FunctionCallbackInfo<v8::Value>& info){
	Nan::HandleScope scope;

	if (info.Length() < 1) {
		Nan::ThrowTypeError("LuaState.DoFile Takes Only 1 Argument");
		return;
	}

	if (!info[0]->IsString()) {
		Nan::ThrowTypeError("LuaState.DoFile Argument 1 Must Be A String");
		return;
	}

	std::string path = std::string(get_str(info[0]));
	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	LuaState::setCurrentInstance(obj);
	lua_State *L = obj->lua_;

	std::replace(path.begin(), path.end(), '\\', '/');
	if (path.back() == '/') {
		path.pop_back();
	}
	std::string code = std::string("package.path = package.path .. '") + path + "/?.lua;';";

	if(luaL_dostring(L, code.c_str())) {
		char buf[1024];
		sprintf(buf, "LuaState.AddPackagePath: Could not add package path:\n%s\n", path.c_str());
		Nan::ThrowError(Nan::New(buf).ToLocalChecked());
		LuaState::setCurrentInstance(0);
		return;
	}
	info.GetReturnValue().Set(Nan::Undefined());
	LuaState::setCurrentInstance(0);
}


void LuaState::LoadFileSync(const Nan::FunctionCallbackInfo<v8::Value>& info){
	Nan::HandleScope scope;

	if (info.Length() < 1) {
		Nan::ThrowTypeError("LuaState.DoFile Takes Only 1 Argument");
		return;
	}

	if (!info[0]->IsString()) {
		Nan::ThrowTypeError("LuaState.DoFile Argument 1 Must Be A String");
		return;
	}

	char* file_name = get_str(info[0]);

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	LuaState::setCurrentInstance(obj);
	lua_State* L = obj->lua_;

	if (luaL_loadfile(L, file_name)) {
		char buf[1024];
		sprintf(buf, "LuaState.LoadFile: Parsing Of File %s Has Failed:\n%s\n", file_name, lua_tostring(L, -1));
		Nan::ThrowError(Nan::New(buf).ToLocalChecked());
		LuaState::setCurrentInstance(0);
		return;
	}

	info.GetReturnValue().Set(Nan::Undefined());
	LuaState::setCurrentInstance(0);
}


void LuaState::LoadStringSync(const Nan::FunctionCallbackInfo<v8::Value>& info) {
   Nan::HandleScope scope;

   if(info.Length() < 1){
	   Nan::ThrowTypeError("LuaState.DoString Requires 1 Argument");
	   return;
   }

   char *lua_code = get_str(info[0]);
   LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
   LuaState::setCurrentInstance(obj);
   lua_State *L = obj->lua_;

   if(luaL_loadstring(L, lua_code)) {
       char buf[1024];
       sprintf(buf, "LuaState.LoadString: Parsing Of Lua Code Has Failed:\n%s\n", lua_tostring(L, -1));
  	   Nan::ThrowError(Nan::New(buf).ToLocalChecked());
	   LuaState::setCurrentInstance(0);
 	   return;
   }
   info.GetReturnValue().Set(Nan::Undefined());
   LuaState::setCurrentInstance(0);
}


void LuaState::DoFileSync(const Nan::FunctionCallbackInfo<v8::Value>& info){
	Nan::HandleScope scope;

	if (info.Length() < 1) {
		Nan::ThrowTypeError("LuaState.DoFile Takes Only 1 Argument");
		return;
	}

	if (!info[0]->IsString()) {
		Nan::ThrowTypeError("LuaState.DoFile Argument 1 Must Be A String");
		return;
	}

	char* file_name = get_str(info[0]);

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	LuaState::setCurrentInstance(obj);
	lua_State* L = obj->lua_;

	if (luaL_dofile(L, file_name)) {
		char buf[1024];
		sprintf(buf, "LuaState.DoFile: Execution Of File %s Has Failed:\n%s\n", file_name, lua_tostring(L, -1));
		Nan::ThrowError(Nan::New(buf).ToLocalChecked());
		LuaState::setCurrentInstance(0);
		return;
	}

	info.GetReturnValue().Set(Nan::Undefined());
	LuaState::setCurrentInstance(0);
}

void LuaState::DoStringSync(const Nan::FunctionCallbackInfo<v8::Value>& info) {
   Nan::HandleScope scope;

   if(info.Length() < 1){
	   Nan::ThrowTypeError("LuaState.DoString Requires 1 Argument");
	   return;
   }

   char *lua_code = get_str(info[0]);
   LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
   LuaState::setCurrentInstance(obj);
   lua_State *L = obj->lua_;

   if(luaL_dostring(L, lua_code)) {
       char buf[1024];
       sprintf(buf, "LuaState.DoString: Execution Of Lua Code Has Failed:\n%s\n", lua_tostring(L, -1));
  	   Nan::ThrowError(Nan::New(buf).ToLocalChecked());
	   LuaState::setCurrentInstance(0);
 	   return;
   }
   info.GetReturnValue().Set(Nan::Undefined());
   LuaState::setCurrentInstance(0);
}

void LuaState::SetGlobal(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	if (info.Length() < 1) {
		Nan::ThrowTypeError("LuaState.SetGlobal Requires 1 Arguments");
		return;
	}

	if (!info[0]->IsString()) {
		Nan::ThrowTypeError("LuaState.SetGlobal Argument 1 Must Be A String");
		return;
	}

	char *global_name = get_str(info[0]);

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());

	lua_setglobal(obj->lua_, global_name);
	info.GetReturnValue().Set(Nan::Undefined());
}

void LuaState::GetGlobal(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	if (info.Length() < 1) {
		Nan::ThrowTypeError("LuaState.GetGlobal Requires 1 Argument");
		return;
	}

	if (!info[0]->IsString()) {
		Nan::ThrowTypeError("LuaState.GetGlobal Argument 1 Must Be A String");
		return;
	}

	char *global_name = get_str(info[0]);

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	lua_getglobal(obj->lua_, global_name);
	info.GetReturnValue().Set(Nan::Undefined());
}

void LuaState::SetField(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	if (info.Length() < 3) {
		Nan::ThrowTypeError("LuaState.SetField Requires 3 Arguments");
		return;
	}

	if (!info[0]->IsNumber()) {
		Nan::ThrowTypeError("LuaState.GetField Argument 1 Must Be A Number");
		return;
	}

	if (!info[1]->IsString()) {
		Nan::ThrowTypeError("LuaState.GetField Argument 2 Must Be A String");
		return;
	}

	int index = Nan::To<int32_t>(info[0]).FromMaybe(0);
	char *field_name = get_str(info[1]);

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());

	push_value_to_lua(obj->lua_, info[1]);
	lua_setfield(obj->lua_, index, field_name);
	info.GetReturnValue().Set(Nan::Undefined());
}

void LuaState::GetField(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	if (info.Length() < 2) {
		Nan::ThrowTypeError("LuaState.GetField Requires 2 Argument");
		return;
	}

	if (!info[0]->IsNumber()) {
		Nan::ThrowTypeError("LuaState.GetField Argument 1 Must Be A Number");
		return;
	}

	if (!info[1]->IsString()) {
		Nan::ThrowTypeError("LuaState.GetField Argument 2 Must Be A String");
		return;
	}

	int index = Nan::To<int32_t>(info[0]).FromMaybe(0);
	char *field_name = get_str(info[1]);

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	lua_getfield(obj->lua_, index, field_name);
	info.GetReturnValue().Set(Nan::Undefined());
}

void LuaState::ToValue(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	if (info.Length() < 1) {
		Nan::ThrowTypeError("LuaState.ToValue Requires 1 Argument");
		return;
	}

	if (!info[0]->IsNumber()) {
		Nan::ThrowTypeError("LuaState.ToValue Argument 1 Must Be A Number");
		return;
	}

	int index = Nan::To<int32_t>(info[0]).FromMaybe(0);

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	Local<Value> val = lua_to_value(obj->lua_, index);
	info.GetReturnValue().Set(val);
}

void LuaState::Call(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	if (info.Length() < 2) {
		Nan::ThrowTypeError("LuaState.Call Requires 2 Argument");
		return;
	}

	if (!info[0]->IsNumber()) {
		Nan::ThrowTypeError("LuaState.Call Argument 1 Must Be A Number");
		return;
	}

	if (!info[1]->IsNumber()) {
		Nan::ThrowTypeError("LuaState.Call Argument 2 Must Be A Number");
		return;
	}


	int args = Nan::To<int32_t>(info[0]).FromMaybe(0);
	int results = Nan::To<int32_t>(info[1]).FromMaybe(0);

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	LuaState::setCurrentInstance(obj);
	lua_State *L = obj->lua_;

	if(lua_pcall(L, args, results, 0)) {
		char buf[1024];
		sprintf(buf, "LuaState.Call: Execution Of Lua Function Has Failed:\n%s\n", lua_tostring(L, -1));
		Nan::ThrowError(Nan::New(buf).ToLocalChecked());
		LuaState::setCurrentInstance(0);
		return;
	}
	LuaState::setCurrentInstance(0);
	info.GetReturnValue().Set(Nan::Undefined());
}

void LuaState::LuaYield(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	if (info.Length() < 1) {
		Nan::ThrowTypeError("LuaState.Yield Requires 1 Argument");
		return;
	}

	if (!info[0]->IsNumber()) {
		Nan::ThrowTypeError("LuaState.Yield Argument 1 Must Be A Number");
		return;
	}

	int args = Nan::To<int32_t>(info[0]).FromMaybe(0);
	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	lua_yield(obj->lua_, args);
	info.GetReturnValue().Set(Nan::Undefined());
}

void LuaState::LuaResume(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	if (info.Length() < 1) {
		Nan::ThrowTypeError("LuaState.Resume Requires 1 Argument");
		return;
	}

	if (!info[0]->IsNumber()) {
		Nan::ThrowTypeError("LuaState.Resume Argument 1 Must Be A Number");
		return;
	}

	int args = Nan::To<int32_t>(info[0]).FromMaybe(0);
	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	lua_resume(obj->lua_, args);
	info.GetReturnValue().Set(Nan::Undefined());
}


void LuaState::Close(const Nan::FunctionCallbackInfo<v8::Value>& info) {
   Nan::HandleScope scope;
   LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
   lua_close(obj->lua_);
   info.GetReturnValue().Set(Nan::Undefined());
}

void LuaState::StatusSync(const Nan::FunctionCallbackInfo<v8::Value>& info){
	Nan::HandleScope scope;
	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	int status = lua_status(obj->lua_);
	info.GetReturnValue().Set(Nan::New(status));
}

void LuaState::CollectGarbageSync(const Nan::FunctionCallbackInfo<v8::Value>& info){
	Nan::HandleScope scope;

	if(info.Length() < 1){
		Nan::ThrowTypeError("LuaState.CollectGarbage Requires 1 Argument");
		return;
	}

	if(!info[0]->IsNumber()){
		Nan::ThrowTypeError("LuaState.CollectGarbage Argument 1 Must Be A Number, try nodelua.GC.[TYPE]");
		return;
	}

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	int type = Nan::To<int32_t>(info[0]).FromMaybe(0);
	int gc = lua_gc(obj->lua_, type, 0);
	info.GetReturnValue().Set(Nan::New(gc));
}

void LuaState::Push(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	if (info.Length() < 1) {
		Nan::ThrowTypeError("LuaState.Push Requires 1 Argument");
		return;
	}

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	push_value_to_lua(obj->lua_, info[0]);
	info.GetReturnValue().Set(Nan::Undefined());
}

void LuaState::Pop(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	int pop_n = 1;
	if (info.Length() > 0 && info[0]->IsNumber()) {
		pop_n = Nan::To<int32_t>(info[0]).FromMaybe(1);
	}

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	lua_pop(obj->lua_, pop_n);
	info.GetReturnValue().Set(Nan::Undefined());
}

void LuaState::GetTop(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	int n = lua_gettop(obj->lua_);
	info.GetReturnValue().Set(Nan::New(n));
}

void LuaState::SetTop(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	int set_n = 0;
	if(info.Length() > 0 && info[0]->IsNumber()){
		set_n = Nan::To<int32_t>(info[0]).FromMaybe(0);
	}

	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	lua_settop(obj->lua_, set_n);
	info.GetReturnValue().Set(Nan::Undefined());
}

void LuaState::Replace(const Nan::FunctionCallbackInfo<v8::Value>& info) {
	Nan::HandleScope scope;

	if (info.Length() < 1) {
		Nan::ThrowTypeError("LuaState.Replace Requires 1 Argument");
		return;
	}

	if (!info[0]->IsNumber()) {
		Nan::ThrowTypeError("LuaState.Replace Argument 1 Must Be A Number");
		return;
	}

	int index = Nan::To<int32_t>(info[0]).FromMaybe(0);
	LuaState* obj = ObjectWrap::Unwrap<LuaState>(info.This());
	lua_replace(obj->lua_, index);
	info.GetReturnValue().Set(Nan::Undefined());
}
