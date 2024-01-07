  var users,
      roles = ['admin','editor','user']

  users = {
    'eve': {
      _id: 'eve',
      roles: ['admin', 'editor']
    },
    'bob': {
      _id: 'bob',
      roles: {
        'group1': ['user'],
        'group2': ['editor']
      }
    },
    'joe': {
      _id: 'joe',
      roles: {
        '__global_roles__': ['admin'],
        'group1': ['editor']
      }
    }
  }

  async function testUserAsync (test, username, expectedRoles, group) {
    var user = users[username]

    // test using user object rather than userId to avoid mocking
    for (const role of roles) {
      var expected = _.contains(expectedRoles, role),
          msg = username + ' expected to have \'' + role + '\' permission but does not',
          nmsg = username + ' had un-expected permission ' + role

      if (expected) {
        await test.isTrue(await Roles.userIsInRoleAsync(user, role, group), msg)
      } else {
        await test.isFalse(await Roles.userIsInRoleAsync(user, role, group), nmsg)
      }
    }
  }

  // Mock Meteor.user() for isInRole handlebars helper testing
  Meteor.user = function () {
    return users.eve
  }

  Tinytest.addAsync(
    'roles - async - can check current users roles via template helper', 
    async function (test) {
      var isInRole,
          expected,
          actual

      if (!Roles._handlebarsHelpers) {
        // probably running package tests outside of a Meteor app.
        // skip this test.
        return
      }

      isInRole = Roles._handlebarsHelpers.isInRoleAsync
      test.equal(typeof isInRole, 'function', "'isInRole' helper not registered")

      expected = true
      actual = await isInRole('admin, editor')
      test.equal(actual, expected)
      
      expected = true
      actual = await isInRole('admin')
      test.equal(actual, expected)

      expected = false
      actual = await isInRole('unknown')
      test.equal(actual, expected)
    })

  Tinytest.addAsync(
    'roles - async - can check if user is in role', 
    async function (test) {
      await testUserAsync(test, 'eve', ['admin', 'editor'])
    })

  Tinytest.addAsync(
    'roles - async - can check if user is in role by group', 
    async function (test) {
      await testUserAsync(test, 'bob', ['user'], 'group1')
      await testUserAsync(test, 'bob', ['editor'], 'group2')
    })

  Tinytest.addAsync(
    'roles - async - can check if user is in role with Roles.GLOBAL_GROUP', 
    async function (test) {
      await testUserAsync(test, 'joe', ['admin'])
      await testUserAsync(test, 'joe', ['admin'], Roles.GLOBAL_GROUP)
      await testUserAsync(test, 'joe', ['admin', 'editor'], 'group1')
    })

  Tinytest.addAsync(
    'roles - async - can get all roles for user by group with periods in name', 
    async function (test) {
      await Roles.addUsersToRolesAsync(users.joe, ['admin'], 'example.k12.va.us')
      test.equal(await Roles.getRolesForUserAsync(users.joe, 'example.k12.va.us'), ['admin'])
    })
