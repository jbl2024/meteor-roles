Package.describe({
  summary: "Authorization package for Meteor",
  version: "1.3.2",
  git: "https://github.com/jbl2024/meteor-roles.git",
  name: "jbl2024:roles"
});

Package.onUse(function (api) {
  api.versionsFrom("2.13.3");

  var both = ['client', 'server'];

  api.use(['ecmascript',
           'underscore',
           'accounts-base@2.2.8',
           'tracker',
           'mongo',
           'check'], both);

  api.use(['blaze@2.5.0'], 'client', {weak: true});

  api.export('Roles');

  api.addFiles('roles/roles_server.js', 'server');
  api.addFiles('roles/roles_common.js', both);
  api.addFiles(['roles/client/debug.js',
                'roles/client/uiHelpers.js',
                'roles/client/subscriptions.js'], 'client');
});

Package.onTest(function (api) {
  api.versionsFrom("2.13.3");

  var both = ['client', 'server'];

  // `accounts-password` is included so `Meteor.users` exists

  api.use(['jbl2024:roles',
           'accounts-password@2.3.4',
           'underscore',
           'tinytest'], both);

  api.addFiles('roles/tests/client.js', 'client');
  api.addFiles('roles/tests/client_async.js', 'client');
  api.addFiles('roles/tests/server.js', 'server');
  api.addFiles('roles/tests/server_async.js', 'server');
});
