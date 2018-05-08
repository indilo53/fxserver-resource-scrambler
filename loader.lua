__SCRIPTS = {
  server = {},
  client = {},
}

local dummies = {
  'resource_manifest_version',
  'dependency',
  'dependencies',
  'ui_page',
  'file',
  'description',
  'version',
  'export',
  'server_export',
  'server_only',
  'resource_type',
  'map',
  'SetResourceInfo',
  'loadscreen',
  'data_file',
  'this_is_a_map',
  'object_file',
  'supersede_radio'
}

function dummy() return dummy end

server_script = function(data)

  if type(data) == 'table' then

    for i=1, #data, 1 do
      table.insert(__SCRIPTS.server, data[i])
    end

  else
    table.insert(__SCRIPTS.server, data)
  end

end

client_script = function(data)

  if type(data) == 'table' then

    for i=1, #data, 1 do
      table.insert(__SCRIPTS.client, data[i])
    end

  else
    table.insert(__SCRIPTS.client, data)
  end

end

server_scripts = server_script
client_scripts = client_script

for i=1, #dummies, 1 do
  _G[dummies[i]]        = dummy
  _G[dummies[i] .. 's'] = dummy
end
