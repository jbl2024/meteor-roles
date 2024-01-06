;(function () {

  var users = {},
      roles = ['admin','editor','user']

  // use to run individual tests
  //Tinytest.oadd = Tinytest.add
  //Tinytest.add = function () {}

  function addUserAsync (name) {
    return Accounts.createUserAsync({'username': name})
  }

  async function resetAsync () {
    await Meteor.roles.removeAsync({})
    await Meteor.users.removeAsync({})

    users = {
      'eve': await addUserAsync('eve'),
      'bob': await addUserAsync('bob'),
      'joe': await addUserAsync('joe')
    }
  }


  async function testUserAsync (test, username, expectedRoles, group) {
    var userId = users[username],
        userObj = await Meteor.users.findOneAsync({_id: userId})
        
    // check using user ids (makes db calls)
    await _innerTestAsync(test, userId, username, expectedRoles, group)

    // check using passed-in user object
    await _innerTestAsync(test, userObj, username, expectedRoles, group)
  }

  async function _innerTestAsync (test, userParam, username, expectedRoles, group) {
    // test that user has only the roles expected and no others
    for (const role of roles) {
      var expected = _.contains(expectedRoles, role),
          msg = username + ' expected to have \'' + role + '\' permission but does not',
          nmsg = username + ' had the following un-expected permission: ' + role

      if (expected) {
        test.isTrue(await Roles.userIsInRoleAsync(userParam, role, group), msg)
      } else {
        test.isFalse(await Roles.userIsInRoleAsync(userParam, role, group), nmsg)
      }
    }
  }

  Tinytest.add(
    'roles - async - can create and delete roles', 
    async function (test) {
      await resetAsync()

      await Roles.createRoleAsync('test1')
      test.equal(await Meteor.roles.findOne().name, 'test1')

      await Roles.createRoleAsync('test2')
      test.equal(await Meteor.roles.findOneAsync({'name':'test2'}).name, 'test2')

      test.equal(await Meteor.roles.find().countAsync(), 2)

      await Roles.deleteRoleAsync('test1')
      test.equal(typeof (await Meteor.roles.findOneAsync({'name':'test1'})), 'undefined')

      await Roles.deleteRoleAsync('test2')
      test.equal(typeof (await Meteor.roles.findOneAsync()), 'undefined')
    })

  Tinytest.add(
    'roles - async - can\'t create duplicate roles', 
    async function (test) {
      await resetAsync()

      await Roles.createRoleAsync('test1')
      test.throws(async function () {await Roles.createRoleAsync('test1')})
    })

  Tinytest.add(
    'roles - async - can\'t create role with empty names', 
    async function (test) {
      await resetAsync() 

      await Roles.createRoleAsync('')
      await Roles.createRoleAsync(null)

      test.equal(Meteor.roles.find().count(), 0)

      await Roles.createRoleAsync(' ')
      test.equal(Meteor.roles.find().count(), 0)
    })

  Tinytest.add(
    'roles - async - can check if user is in role', 
    async function (test) {
      await resetAsync()

      Meteor.users.update(
        {"_id":users.eve}, 
        {$addToSet: { roles: { $each: ['admin', 'user'] } } }
      )
      await testUserAsync(test, 'eve', ['admin', 'user'])
    })

  Tinytest.add(
    'roles - async - can check if user is in role by group', 
    async function (test) {
      await resetAsync()

      Meteor.users.update(
        {"_id":users.eve}, 
        {$addToSet: { 'roles.group1': { $each: ['admin', 'user'] } } })
      Meteor.users.update(
        {"_id":users.eve}, 
        {$addToSet: { 'roles.group2': { $each: ['editor'] } } })

      await testUserAsync(test, 'eve', ['admin', 'user'], 'group1')
      await testUserAsync(test, 'eve', ['editor'], 'group2')
    })

  Tinytest.add(
    'roles - async - can check if non-existant user is in role', 
    async function (test) {
      await resetAsync()

      test.isFalse(await Roles.userIsInRoleAsync('1', 'admin'))
    })

  Tinytest.add(
    'roles - async - can check if null user is in role', 
    async function (test) {
      var user = null
      await resetAsync()
      
      test.isFalse(await Roles.userIsInRoleAsync(user, 'admin'))
    })

  Tinytest.add(
    'roles - async - can check user against several roles at once', 
    async function (test) {
      var user 
      await resetAsync()

      await Roles.addUsersToRolesAsync(users.eve, ['admin', 'user'])
      user = await Meteor.users.findOneAsync({_id:users.eve})

      test.isTrue(await Roles.userIsInRoleAsync(user, ['editor','admin']))
    })

  Tinytest.add(
    'roles - async - can\'t add non-existent user to role', 
    async function (test) {
      await resetAsync()

      await Roles.addUsersToRolesAsync(['1'], ['admin'])
      test.equal(await Meteor.users.findOneAsync({_id:'1'}), undefined)
    })

  Tinytest.add(
    'roles - async - can add individual users to roles', 
    async function (test) {
      await resetAsync() 

      await Roles.addUsersToRolesAsync(users.eve, ['admin', 'user'])

      await testUserAsync(test, 'eve', ['admin', 'user'])
      await testUserAsync(test, 'bob', [])
      await testUserAsync(test, 'joe', [])

      await Roles.addUsersToRolesAsync(users.joe, ['editor', 'user'])

      await testUserAsync(test, 'eve', ['admin', 'user'])
      await testUserAsync(test, 'bob', [])
      await testUserAsync(test, 'joe', ['editor', 'user'])
    })

  Tinytest.add(
    'roles - async - can add individual users to roles by group', 
    async function (test) {
      await resetAsync() 

      await Roles.addUsersToRolesAsync(users.eve, ['admin', 'user'], 'group1')

      await testUserAsync(test, 'eve', ['admin', 'user'], 'group1')
      await testUserAsync(test, 'bob', [], 'group1')
      await testUserAsync(test, 'joe', [], 'group1')

      await testUserAsync(test, 'eve', [], 'group2')
      await testUserAsync(test, 'bob', [], 'group2')
      await testUserAsync(test, 'joe', [], 'group2')

      await Roles.addUsersToRolesAsync(users.joe, ['editor', 'user'], 'group1')
      await Roles.addUsersToRolesAsync(users.bob, ['editor', 'user'], 'group2')

      await testUserAsync(test, 'eve', ['admin', 'user'], 'group1')
      await testUserAsync(test, 'bob', [], 'group1')
      await testUserAsync(test, 'joe', ['editor', 'user'], 'group1')

      await testUserAsync(test, 'eve', [], 'group2')
      await testUserAsync(test, 'bob', ['editor', 'user'], 'group2')
      await testUserAsync(test, 'joe', [], 'group2')
    })

  Tinytest.add(
    'roles - async - can add user to roles via user object', 
    async function (test) {
      await resetAsync() 

      var eve = await Meteor.users.findOneAsync({_id: users.eve}),
          bob = await Meteor.users.findOneAsync({_id: users.bob})

      await Roles.addUsersToRolesAsync(eve, ['admin', 'user'])

      await testUserAsync(test, 'eve', ['admin', 'user'])
      await testUserAsync(test, 'bob', [])
      await testUserAsync(test, 'joe', [])

      await Roles.addUsersToRolesAsync(bob, ['editor'])

      await testUserAsync(test, 'eve', ['admin', 'user'])
      await testUserAsync(test, 'bob', ['editor'])
      await testUserAsync(test, 'joe', [])
    })

  Tinytest.add(
    'roles - async - can add user to roles multiple times', 
    async function (test) {
      await resetAsync() 

      await Roles.addUsersToRolesAsync(users.eve, ['admin', 'user'])
      await Roles.addUsersToRolesAsync(users.eve, ['admin', 'user'])

      await testUserAsync(test, 'eve', ['admin', 'user'])
      await testUserAsync(test, 'bob', [])
      await testUserAsync(test, 'joe', [])

      await Roles.addUsersToRolesAsync(users.bob, ['admin'])
      await Roles.addUsersToRolesAsync(users.bob, ['editor'])

      await testUserAsync(test, 'eve', ['admin', 'user'])
      await testUserAsync(test, 'bob', ['admin', 'editor'])
      await testUserAsync(test, 'joe', [])
    })

  Tinytest.add(
    'roles - async - can add user to roles multiple times by group', 
    async function (test) {
      await resetAsync() 

      await Roles.addUsersToRolesAsync(users.eve, ['admin', 'user'], 'group1')
      await Roles.addUsersToRolesAsync(users.eve, ['admin', 'user'], 'group1')

      await testUserAsync(test, 'eve', ['admin', 'user'], 'group1')
      await testUserAsync(test, 'bob', [], 'group1')
      await testUserAsync(test, 'joe', [], 'group1')

      await Roles.addUsersToRolesAsync(users.bob, ['admin'], 'group1')
      await Roles.addUsersToRolesAsync(users.bob, ['editor'], 'group1')

      await testUserAsync(test, 'eve', ['admin', 'user'], 'group1')
      await testUserAsync(test, 'bob', ['admin', 'editor'], 'group1')
      await testUserAsync(test, 'joe', [], 'group1')
    })

  Tinytest.add(
    'roles - async - can add multiple users to roles', 
    async function (test) {
      await resetAsync() 

      await Roles.addUsersToRolesAsync([users.eve, users.bob], ['admin', 'user'])

      await testUserAsync(test, 'eve', ['admin', 'user'])
      await testUserAsync(test, 'bob', ['admin', 'user'])
      await testUserAsync(test, 'joe', [])

      await Roles.addUsersToRolesAsync([users.bob, users.joe], ['editor', 'user'])

      await testUserAsync(test, 'eve', ['admin', 'user'])
      await testUserAsync(test, 'bob', ['admin', 'editor', 'user'])
      await testUserAsync(test, 'joe', ['editor', 'user'])
    })

  Tinytest.add(
    'roles - async - can add multiple users to roles by group', 
    async function (test) {
      await resetAsync() 

      await Roles.addUsersToRolesAsync([users.eve, users.bob], ['admin', 'user'], 'group1')

      await testUserAsync(test, 'eve', ['admin', 'user'], 'group1')
      await testUserAsync(test, 'bob', ['admin', 'user'], 'group1')
      await testUserAsync(test, 'joe', [], 'group1')

      await testUserAsync(test, 'eve', [], 'group2')
      await testUserAsync(test, 'bob', [], 'group2')
      await testUserAsync(test, 'joe', [], 'group2')

      await Roles.addUsersToRolesAsync([users.bob, users.joe], ['editor', 'user'], 'group1')
      await Roles.addUsersToRolesAsync([users.bob, users.joe], ['editor', 'user'], 'group2')

      await testUserAsync(test, 'eve', ['admin', 'user'], 'group1')
      await testUserAsync(test, 'bob', ['admin', 'editor', 'user'], 'group1')
      await testUserAsync(test, 'joe', ['editor', 'user'], 'group1')

      await testUserAsync(test, 'eve', [], 'group2')
      await testUserAsync(test, 'bob', ['editor', 'user'], 'group2')
      await testUserAsync(test, 'joe', ['editor', 'user'], 'group2')
    })

  Tinytest.add(
    'roles - async - can remove individual users from roles', 
    async function (test) {
      await resetAsync() 

      // remove user role - one user
      await Roles.addUsersToRolesAsync([users.eve, users.bob], ['editor', 'user'])
      await testUserAsync(test, 'eve', ['editor', 'user'])
      await testUserAsync(test, 'bob', ['editor', 'user'])
      await Roles.removeUsersFromRolesAsync(users.eve, ['user'])
      await testUserAsync(test, 'eve', ['editor'])
      await testUserAsync(test, 'bob', ['editor', 'user'])
    })
  Tinytest.add(
    'roles - async - can remove user from roles multiple times',
    async function (test) {
      await resetAsync() 

      // remove user role - one user
      await Roles.addUsersToRolesAsync([users.eve, users.bob], ['editor', 'user'])
      await testUserAsync(test, 'eve', ['editor', 'user'])
      await testUserAsync(test, 'bob', ['editor', 'user'])
      await Roles.removeUsersFromRolesAsync(users.eve, ['user'])
      await testUserAsync(test, 'eve', ['editor'])
      await testUserAsync(test, 'bob', ['editor', 'user'])

      // try remove again
      await Roles.removeUsersFromRolesAsync(users.eve, ['user'])
      await testUserAsync(test, 'eve', ['editor'])
    })

  Tinytest.add(
    'roles - async - can remove users from roles via user object', 
    async function (test) {
      await resetAsync() 

      var eve = await Meteor.users.findOneAsync({_id: users.eve}),
          bob = await Meteor.users.findOneAsync({_id: users.bob})
    
      // remove user role - one user
      await Roles.addUsersToRolesAsync([eve, bob], ['editor', 'user'])
      await testUserAsync(test, 'eve', ['editor', 'user'])
      await testUserAsync(test, 'bob', ['editor', 'user'])
      await Roles.removeUsersFromRolesAsync(eve, ['user'])
      await testUserAsync(test, 'eve', ['editor'])
      await testUserAsync(test, 'bob', ['editor', 'user'])
    })


  Tinytest.add(
    'roles - async - can remove individual users from roles by group', 
    async function (test) {
      await resetAsync() 

      // remove user role - one user
      await Roles.addUsersToRolesAsync([users.eve, users.bob], ['editor', 'user'], 'group1')
      await Roles.addUsersToRolesAsync([users.joe, users.bob], ['admin'], 'group2')
      await testUserAsync(test, 'eve', ['editor', 'user'], 'group1')
      await testUserAsync(test, 'bob', ['editor', 'user'], 'group1')
      await testUserAsync(test, 'joe', [], 'group1')
      await testUserAsync(test, 'eve', [], 'group2')
      await testUserAsync(test, 'bob', ['admin'], 'group2')
      await testUserAsync(test, 'joe', ['admin'], 'group2')

      await Roles.removeUsersFromRolesAsync(users.eve, ['user'], 'group1')
      await testUserAsync(test, 'eve', ['editor'], 'group1')
      await testUserAsync(test, 'bob', ['editor', 'user'], 'group1')
      await testUserAsync(test, 'joe', [], 'group1')
      await testUserAsync(test, 'eve', [], 'group2')
      await testUserAsync(test, 'bob', ['admin'], 'group2')
      await testUserAsync(test, 'joe', ['admin'], 'group2')
    })

  Tinytest.add(
    'roles - async - can remove multiple users from roles', 
    async function (test) {
      await resetAsync() 

      // remove user role - two users
      await Roles.addUsersToRolesAsync([users.eve, users.bob], ['editor', 'user'])
      await testUserAsync(test, 'eve', ['editor', 'user'])
      await testUserAsync(test, 'bob', ['editor', 'user'])

      test.isFalse(await Roles.userIsInRoleAsync(users.joe, 'admin'))
      await Roles.addUsersToRolesAsync([users.bob, users.joe], ['admin', 'user'])
      await testUserAsync(test, 'bob', ['admin', 'user', 'editor'])
      await testUserAsync(test, 'joe', ['admin', 'user'])
      await Roles.removeUsersFromRolesAsync([users.bob, users.joe], ['admin'])
      await testUserAsync(test, 'bob', ['user', 'editor'])
      await testUserAsync(test, 'joe', ['user'])
    })

  Tinytest.add(
    'roles - async - can remove multiple users from roles by group', 
    async function (test) {
      await resetAsync() 

      // remove user role - one user
      await Roles.addUsersToRolesAsync([users.eve, users.bob], ['editor', 'user'], 'group1')
      await Roles.addUsersToRolesAsync([users.joe, users.bob], ['admin'], 'group2')
      await testUserAsync(test, 'eve', ['editor', 'user'], 'group1')
      await testUserAsync(test, 'bob', ['editor', 'user'], 'group1')
      await testUserAsync(test, 'joe', [], 'group1')
      await testUserAsync(test, 'eve', [], 'group2')
      await testUserAsync(test, 'bob', ['admin'], 'group2')
      await testUserAsync(test, 'joe', ['admin'], 'group2')

      await Roles.removeUsersFromRolesAsync([users.eve, users.bob], ['user'], 'group1')
      await testUserAsync(test, 'eve', ['editor'], 'group1')
      await testUserAsync(test, 'bob', ['editor'], 'group1')
      await testUserAsync(test, 'joe', [], 'group1')
      await testUserAsync(test, 'eve', [], 'group2')
      await testUserAsync(test, 'bob', ['admin'], 'group2')
      await testUserAsync(test, 'joe', ['admin'], 'group2')

      await Roles.removeUsersFromRolesAsync([users.joe, users.bob], ['admin'], 'group2')
      await testUserAsync(test, 'eve', [], 'group2')
      await testUserAsync(test, 'bob', [], 'group2')
      await testUserAsync(test, 'joe', [], 'group2')
    })

  Tinytest.add(
    'roles - async - can set user roles', 
    async function (test) {
      await resetAsync() 

      var eve = await Meteor.users.findOneAsync({_id: users.eve}),
          bob = await Meteor.users.findOneAsync({_id: users.bob}),
          joe = await Meteor.users.findOneAsync({_id: users.joe})
    
      await Roles.setUserRolesAsync([users.eve, bob], ['editor', 'user'])
      await testUserAsync(test, 'eve', ['editor', 'user'])
      await testUserAsync(test, 'bob', ['editor', 'user'])
      await testUserAsync(test, 'joe', [])

      // use addUsersToRoles add some roles
      await Roles.addUsersToRolesAsync([bob, users.joe], ['admin'])
      await testUserAsync(test, 'eve', ['editor', 'user'])
      await testUserAsync(test, 'bob', ['admin', 'editor', 'user'])
      await testUserAsync(test, 'joe', ['admin'])

      await Roles.setUserRolesAsync([eve, bob], ['user'])
      await testUserAsync(test, 'eve', ['user'])
      await testUserAsync(test, 'bob', ['user'])
      await testUserAsync(test, 'joe', ['admin'])

      await Roles.setUserRolesAsync(bob, 'editor')
      await testUserAsync(test, 'eve', ['user'])
      await testUserAsync(test, 'bob', ['editor'])
      await testUserAsync(test, 'joe', ['admin'])

      await Roles.setUserRolesAsync([users.joe, users.bob], [])
      await testUserAsync(test, 'eve', ['user'])
      await testUserAsync(test, 'bob', [])
      await testUserAsync(test, 'joe', [])
    })

  Tinytest.add(
    'roles - async - can set user roles by group', 
    async function (test) {
      await resetAsync() 

      var eve = await Meteor.users.findOneAsync({_id: users.eve}),
          bob = await Meteor.users.findOneAsync({_id: users.bob}),
          joe = await Meteor.users.findOneAsync({_id: users.joe})
    
      await Roles.setUserRolesAsync([users.eve, users.bob], ['editor', 'user'], 'group1')
      await Roles.setUserRolesAsync([users.bob, users.joe], ['admin'], 'group2')
      await testUserAsync(test, 'eve', ['editor', 'user'], 'group1')
      await testUserAsync(test, 'bob', ['editor', 'user'], 'group1')
      await testUserAsync(test, 'joe', [], 'group1')
      await testUserAsync(test, 'eve', [], 'group2')
      await testUserAsync(test, 'bob', ['admin'], 'group2')
      await testUserAsync(test, 'joe', ['admin'], 'group2')

      // use addUsersToRoles add some roles
      await Roles.addUsersToRolesAsync([users.eve, users.bob], ['admin'], 'group1')
      await Roles.addUsersToRolesAsync([users.bob, users.joe], ['editor'], 'group2')
      await testUserAsync(test, 'eve', ['admin', 'editor', 'user'], 'group1')
      await testUserAsync(test, 'bob', ['admin', 'editor', 'user'], 'group1')
      await testUserAsync(test, 'joe', [], 'group1')
      await testUserAsync(test, 'eve', [], 'group2')
      await testUserAsync(test, 'bob', ['admin','editor'], 'group2')
      await testUserAsync(test, 'joe', ['admin','editor'], 'group2')

      await Roles.setUserRolesAsync([eve, bob], ['user'], 'group1')
      await Roles.setUserRolesAsync([eve, joe], ['editor'], 'group2')
      await testUserAsync(test, 'eve', ['user'], 'group1')
      await testUserAsync(test, 'bob', ['user'], 'group1')
      await testUserAsync(test, 'joe', [], 'group1')
      await testUserAsync(test, 'eve', ['editor'], 'group2')
      await testUserAsync(test, 'bob', ['admin','editor'], 'group2')
      await testUserAsync(test, 'joe', ['editor'], 'group2')

      await Roles.setUserRolesAsync(bob, 'editor', 'group1')
      await testUserAsync(test, 'eve', ['user'], 'group1')
      await testUserAsync(test, 'bob', ['editor'], 'group1')
      await testUserAsync(test, 'joe', [], 'group1')
      await testUserAsync(test, 'eve', ['editor'], 'group2')
      await testUserAsync(test, 'bob', ['admin','editor'], 'group2')
      await testUserAsync(test, 'joe', ['editor'], 'group2')

      await Roles.setUserRolesAsync([bob, users.joe], [], 'group1')
      await testUserAsync(test, 'eve', ['user'], 'group1')
      await testUserAsync(test, 'bob', [], 'group1')
      await testUserAsync(test, 'joe', [], 'group1')
      await testUserAsync(test, 'eve', ['editor'], 'group2')
      await testUserAsync(test, 'bob', ['admin','editor'], 'group2')
      await testUserAsync(test, 'joe', ['editor'], 'group2')
    })

  Tinytest.add(
    'roles - async - can set user roles by group including GLOBAL_GROUP', 
    async function (test) {
      await resetAsync() 

      var eve = await Meteor.users.findOneAsync({_id: users.eve}),
          bob = await Meteor.users.findOneAsync({_id: users.bob}),
          joe = await Meteor.users.findOneAsync({_id: users.joe})
    
      await Roles.addUsersToRolesAsync(eve, 'admin', Roles.GLOBAL_GROUP)
      await testUserAsync(test, 'eve', ['admin'], 'group1')
      await testUserAsync(test, 'eve', ['admin'])

      await Roles.setUserRolesAsync(eve, 'editor', Roles.GLOBAL_GROUP)
      await testUserAsync(test, 'eve', ['editor'], 'group2')
      await testUserAsync(test, 'eve', ['editor'])
    })


  Tinytest.add(
    'roles - async - can get all roles', 
    async function (test) {
      await resetAsync()
      for (const role of roles) {
        await Roles.createRoleAsync(role)
      }

      // compare roles, sorted alphabetically
      var expected = roles,
          actual = _.pluck(await Roles.getAllRoles().fetchAsync(), 'name')

      test.equal(actual, expected)
    })

  Tinytest.add(
    'roles - async - can\'t get roles for non-existant user', 
    async function (test) {
      await resetAsync()
      test.equal(await Roles.getRolesForUserAsync('1'), [])
      test.equal(await Roles.getRolesForUserAsync('1', 'group1'), [])
    })

  Tinytest.add(
    'roles - async - can get all roles for user', 
    async function (test) {
      await resetAsync()

      var userId = users.eve,
          userObj

      // by userId
      test.equal(await Roles.getRolesForUserAsync(userId), [])

      // by user object
      userObj = await Meteor.users.findOneAsync({_id: userId})
      test.equal(await Roles.getRolesForUserAsync(userObj), [])


      await Roles.addUsersToRolesAsync(userId, ['admin', 'user'])

      // by userId
      test.equal(await Roles.getRolesForUserAsync(userId), ['admin', 'user'])

      // by user object
      userObj = await Meteor.users.findOneAsync({_id: userId})
      test.equal(await Roles.getRolesForUserAsync(userObj), ['admin', 'user'])
    })

  Tinytest.add(
    'roles - async - can get all roles for user by group', 
    async function (test) {
      await resetAsync()

      var userId = users.eve,
          userObj

      // by userId
      test.equal(await Roles.getRolesForUserAsync(userId, 'group1'), [])

      // by user object
      userObj = await Meteor.users.findOneAsync({_id: userId})
      test.equal(await Roles.getRolesForUserAsync(userObj, 'group1'), [])


      // add roles
      await Roles.addUsersToRolesAsync(userId, ['admin', 'user'], 'group1')

      // by userId
      test.equal(await Roles.getRolesForUserAsync(userId, 'group1'), ['admin', 'user'])
      test.equal(await Roles.getRolesForUserAsync(userId), [])

      // by user object
      userObj = await Meteor.users.findOneAsync({_id: userId})
      test.equal(await Roles.getRolesForUserAsync(userObj, 'group1'), ['admin', 'user'])
      test.equal(await Roles.getRolesForUserAsync(userObj), [])
    })

  Tinytest.add(
    'roles - async - can get all roles for user by group with periods in name', 
    async function (test) {
      await resetAsync()

      await Roles.addUsersToRolesAsync(users.joe, ['admin'], 'example.k12.va.us')

      test.equal(await Roles.getRolesForUserAsync(users.joe, 'example.k12.va.us'), ['admin'])
    })

  Tinytest.add(
    'roles - async - can get all roles for user by group including Roles.GLOBAL_GROUP', 
    async function (test) {
      await resetAsync()

      var userId = users.eve,
          userObj

      await Roles.addUsersToRolesAsync([users.eve], ['editor'], Roles.GLOBAL_GROUP)
      await Roles.addUsersToRolesAsync([users.eve], ['admin', 'user'], 'group1')

      // by userId
      test.equal(await Roles.getRolesForUserAsync(userId, 'group1'), ['admin', 'user', 'editor'])
      test.equal(await Roles.getRolesForUserAsync(userId), ['editor'])

      // by user object
      userObj = await Meteor.users.findOneAsync({_id: userId})
      test.equal(await Roles.getRolesForUserAsync(userObj, 'group1'), ['admin', 'user', 'editor'])
      test.equal(await Roles.getRolesForUserAsync(userObj), ['editor'])
    })


  Tinytest.add(
    'roles - async - getRolesForUser should not return null entries if user has no roles for group', 
    async function (test) {
      await resetAsync()

      var userId = users.eve,
          userObj

      // by userId
      test.equal(await Roles.getRolesForUserAsync(userId, 'group1'), [])
      test.equal(await Roles.getRolesForUserAsync(userId), [])

      // by user object
      userObj = await Meteor.users.findOneAsync({_id: userId})
      test.equal(await Roles.getRolesForUserAsync(userObj, 'group1'), [])
      test.equal(await Roles.getRolesForUserAsync(userObj), [])


      await Roles.addUsersToRolesAsync([users.eve], ['editor'], Roles.GLOBAL_GROUP)

      // by userId
      test.equal(await Roles.getRolesForUserAsync(userId, 'group1'), ['editor'])
      test.equal(await Roles.getRolesForUserAsync(userId), ['editor'])

      // by user object
      userObj = await Meteor.users.findOneAsync({_id: userId})
      test.equal(await Roles.getRolesForUserAsync(userObj, 'group1'), ['editor'])
      test.equal(await Roles.getRolesForUserAsync(userObj), ['editor'])
    })
    
  Tinytest.add(
    'roles - async - can get all groups for user', 
    async function (test) {
      await resetAsync()

    var userId = users.eve,
        userObj

    await Roles.addUsersToRolesAsync([users.eve], ['editor'], 'group1')
    await Roles.addUsersToRolesAsync([users.eve], ['admin', 'user'], 'group2')

    // by userId
    test.equal(Roles.getGroupsForUser(userId), ['group1', 'group2'])

    // by user object
    userObj = await Meteor.users.findOneAsync({_id: userId})
    test.equal(Roles.getGroupsForUser(userObj), ['group1', 'group2'])
  })
  
  Tinytest.add(
    'roles - async - can get all groups for user by role', 
    async function (test) {
      await resetAsync()

    var userId = users.eve,
        userObj

    await Roles.addUsersToRolesAsync([users.eve], ['editor'], 'group1')
    await Roles.addUsersToRolesAsync([users.eve], ['editor', 'user'], 'group2')

    // by userId
    test.equal(Roles.getGroupsForUser(userId, 'user'), ['group2'])
    test.equal(Roles.getGroupsForUser(userId, 'editor'), ['group1', 'group2'])
    test.equal(Roles.getGroupsForUser(userId, 'admin'), [])

    // by user object
    userObj = await Meteor.users.findOneAsync({_id: userId})
    test.equal(Roles.getGroupsForUser(userObj, 'user'), ['group2'])
    test.equal(Roles.getGroupsForUser(userObj, 'editor'), ['group1', 'group2'])
    test.equal(Roles.getGroupsForUser(userObj, 'admin'), [])
  })
  
  Tinytest.add(
    'roles - async - getGroupsForUser returns [] when not using groups', 
    async function (test) {
      await resetAsync()

    var userId = users.eve,
        userObj

    await Roles.addUsersToRolesAsync([users.eve], ['editor', 'user'])

    // by userId
    test.equal(Roles.getGroupsForUser(userId), [])
    test.equal(Roles.getGroupsForUser(userId, 'editor'), [])

    // by user object
    userObj = await Meteor.users.findOneAsync({_id: userId})
    test.equal(Roles.getGroupsForUser(userObj), [])
    test.equal(Roles.getGroupsForUser(userObj, 'editor'), [])
  })
  
  
  Tinytest.add(
    'roles - async - getting all groups for user does not include GLOBAL_GROUP', 
    async function (test) {
      await resetAsync()

    var userId = users.eve,
        userObj

    await Roles.addUsersToRolesAsync([users.eve], ['editor'], 'group1')
    await Roles.addUsersToRolesAsync([users.eve], ['editor', 'user'], 'group2')
    await Roles.addUsersToRolesAsync([users.eve], ['editor', 'user', 'admin'], Roles.GLOBAL_GROUP)

    // by userId
    test.equal(Roles.getGroupsForUser(userId, 'user'), ['group2'])
    test.equal(Roles.getGroupsForUser(userId, 'editor'), ['group1', 'group2'])
    test.equal(Roles.getGroupsForUser(userId, 'admin'), [])

    // by user object
    userObj = await Meteor.users.findOneAsync({_id: userId})
    test.equal(Roles.getGroupsForUser(userObj, 'user'), ['group2'])
    test.equal(Roles.getGroupsForUser(userObj, 'editor'), ['group1', 'group2'])
    test.equal(Roles.getGroupsForUser(userObj, 'admin'), [])
  })


  Tinytest.add(
    'roles - async - can get all users in role', 
    async function (test) {
      await resetAsync()
      for (const role of roles) {
        await Roles.createRoleAsync(role)
      }

      await Roles.addUsersToRolesAsync([users.eve, users.joe], ['admin', 'user'])
      await Roles.addUsersToRolesAsync([users.bob, users.joe], ['editor'])

      var expected = [users.eve, users.joe],
          actual = _.pluck(await Roles.getUsersInRoleAsync('admin').fetchAsync(), '_id')

      // order may be different so check difference instead of equality
      // difference uses first array as base so have to check both ways
      test.equal(_.difference(actual, expected), [])
      test.equal(_.difference(expected, actual), [])
    })

  Tinytest.add(
    'roles - async - can get all users in role by group', 
    async function (test) {
      await resetAsync()
      await Roles.addUsersToRolesAsync([users.eve, users.joe], ['admin', 'user'], 'group1')
      await Roles.addUsersToRolesAsync([users.bob, users.joe], ['admin'], 'group2')

      var expected = [users.eve, users.joe],
          actual = _.pluck(await Roles.getUsersInRoleAsync('admin','group1').fetchAsync(), '_id')

      // order may be different so check difference instead of equality
      // difference uses first array as base so have to check both ways
      test.equal(_.difference(actual, expected), [])
      test.equal(_.difference(expected, actual), [])
    })
  
  Tinytest.add(
    'roles - async - can get all users in role by group including Roles.GLOBAL_GROUP', 
    async function (test) {
      await resetAsync()
      await Roles.addUsersToRolesAsync([users.eve], ['admin', 'user'], Roles.GLOBAL_GROUP)
      await Roles.addUsersToRolesAsync([users.bob, users.joe], ['admin'], 'group2')

      var expected = [users.eve],
          actual = _.pluck(await Roles.getUsersInRoleAsync('admin','group1').fetchAsync(), '_id')

      // order may be different so check difference instead of equality
      // difference uses first array as base so have to check both ways
      test.equal(_.difference(actual, expected), [])
      test.equal(_.difference(expected, actual), [])

      expected = [users.eve, users.bob, users.joe]
      actual = _.pluck(await Roles.getUsersInRoleAsync('admin','group2').fetchAsync(), '_id')

      // order may be different so check difference instead of equality
      test.equal(_.difference(actual, expected), [])
      test.equal(_.difference(expected, actual), [])


      expected = [users.eve]
      actual = _.pluck(await Roles.getUsersInRoleAsync('admin').fetchAsync(), '_id')

      // order may be different so check difference instead of equality
      test.equal(_.difference(actual, expected), [])
      test.equal(_.difference(expected, actual), [])
    })

  Tinytest.add(
    'roles - async - can get all users in role by group and passes through mongo query arguments', 
    async function (test) {
      await resetAsync()
      await Roles.addUsersToRolesAsync([users.eve, users.joe], ['admin', 'user'], 'group1')
      await Roles.addUsersToRolesAsync([users.bob, users.joe], ['admin'], 'group2')

      var results = await Roles.getUsersInRoleAsync('admin','group1', { fields: { username: 0 }, limit: 1 }).fetchAsync();

      test.equal(1, results.length);
      test.isTrue(results[0].hasOwnProperty('_id'));
      test.isFalse(results[0].hasOwnProperty('username'));
    })


  Tinytest.add(
    'roles - async - can use Roles.GLOBAL_GROUP to assign blanket permissions',
    async function (test) {
      await resetAsync()

      await Roles.addUsersToRolesAsync([users.joe, users.bob], ['admin'], Roles.GLOBAL_GROUP)

      await testUserAsync(test, 'eve', [], 'group1')
      await testUserAsync(test, 'joe', ['admin'], 'group2')
      await testUserAsync(test, 'joe', ['admin'], 'group1')
      await testUserAsync(test, 'bob', ['admin'], 'group2')
      await testUserAsync(test, 'bob', ['admin'], 'group1')

      await Roles.removeUsersFromRolesAsync(users.joe, ['admin'], Roles.GLOBAL_GROUP)

      await testUserAsync(test, 'eve', [], 'group1')
      await testUserAsync(test, 'joe', [], 'group2')
      await testUserAsync(test, 'joe', [], 'group1')
      await testUserAsync(test, 'bob', ['admin'], 'group2')
      await testUserAsync(test, 'bob', ['admin'], 'group1')
    })

  Tinytest.add(
    'roles - async - Roles.GLOBAL_GROUP is independent of other groups',
    async function (test) {
      await resetAsync()

      await Roles.addUsersToRolesAsync([users.joe, users.bob], ['admin'], 'group5')
      await Roles.addUsersToRolesAsync([users.joe, users.bob], ['admin'], Roles.GLOBAL_GROUP)

      await testUserAsync(test, 'eve', [], 'group1')
      await testUserAsync(test, 'joe', ['admin'], 'group5')
      await testUserAsync(test, 'joe', ['admin'], 'group2')
      await testUserAsync(test, 'joe', ['admin'], 'group1')
      await testUserAsync(test, 'bob', ['admin'], 'group5')
      await testUserAsync(test, 'bob', ['admin'], 'group2')
      await testUserAsync(test, 'bob', ['admin'], 'group1')

      await Roles.removeUsersFromRolesAsync(users.joe, ['admin'], Roles.GLOBAL_GROUP)

      await testUserAsync(test, 'eve', [], 'group1')
      await testUserAsync(test, 'joe', ['admin'], 'group5')
      await testUserAsync(test, 'joe', [], 'group2')
      await testUserAsync(test, 'joe', [], 'group1')
      await testUserAsync(test, 'bob', ['admin'], 'group5')
      await testUserAsync(test, 'bob', ['admin'], 'group2')
      await testUserAsync(test, 'bob', ['admin'], 'group1')
    })
  
  Tinytest.add(
    'roles - async - Roles.GLOBAL_GROUP also checked when group not specified',
    async function (test) {
      await resetAsync()

      await Roles.addUsersToRolesAsync(users.joe, 'admin', Roles.GLOBAL_GROUP)

      await testUserAsync(test, 'joe', ['admin'])

      await Roles.removeUsersFromRolesAsync(users.joe, 'admin', Roles.GLOBAL_GROUP)

      await testUserAsync(test, 'joe', [])
    })

  Tinytest.add(
    'roles - async - mixing group with non-group throws descriptive error', 
    async function (test) {
      var expectedErrorMsg = "Roles error: Can't mix grouped and non-grouped roles for same user"

      await resetAsync() 
      await Roles.addUsersToRolesAsync(users.joe, ['editor', 'user'], 'group1')
      try {
        await Roles.addUsersToRolesAsync(users.joe, ['admin'])
        throw new Error("expected exception but didn't get one")
      } 
      catch (ex) {
        test.isTrue(ex.message == expectedErrorMsg, ex.message)
      }

      await resetAsync() 
      await Roles.addUsersToRolesAsync(users.bob, ['editor', 'user'])
      try {
        await Roles.addUsersToRolesAsync(users.bob, ['admin'], 'group2')
        throw new Error("expected exception but didn't get one")
      }
      catch (ex) {
        test.isTrue(ex.message == expectedErrorMsg, ex.message)
      }

      await resetAsync() 
      await Roles.addUsersToRolesAsync(users.bob, ['editor', 'user'], 'group1')
      try {
        await Roles.removeUsersFromRolesAsync(users.bob, ['user'])
        throw new Error("expected exception but didn't get one")
      }
      catch (ex) {
        test.isTrue(ex.message == expectedErrorMsg, ex.message)
      }

      await resetAsync() 
      await Roles.addUsersToRolesAsync(users.bob, ['editor', 'user'])
      try {
        await Roles.setUserRolesAsync(users.bob, ['user'], 'group1')
        throw new Error("expected exception but didn't get one")
      }
      catch (ex) {
        test.isTrue(ex.message == expectedErrorMsg, ex.message)
      }

      await resetAsync() 
      await Roles.addUsersToRolesAsync(users.bob, ['editor', 'user'])
      try {
        await Roles.removeUsersFromRolesAsync(users.bob, ['user'], 'group1')
      }
      catch (ex) {
        test.isTrue(ex.message == expectedErrorMsg, ex.message)
      }

      await resetAsync() 
      await Roles.addUsersToRolesAsync(users.bob, ['editor', 'user'], 'group1')
      // this is probably not a good idea but shouldn't throw...
      await Roles.setUserRolesAsync(users.bob, ['user'])
    })

  Tinytest.add(
    "roles - async - can use '.' in group name",
    async function (test) {
      await resetAsync() 

      await Roles.addUsersToRolesAsync(users.joe, ['admin'], 'example.com')
      await testUserAsync(test, 'joe', ['admin'], 'example.com')
    })

  Tinytest.add(
    "roles - async - can use multiple periods in group name",
    async function (test) {
      await resetAsync() 

      await Roles.addUsersToRolesAsync(users.joe, ['admin'], 'example.k12.va.us')
      await testUserAsync(test, 'joe', ['admin'], 'example.k12.va.us')
    })

  Tinytest.add(
    'roles - async - invalid group name throws descriptive error', 
    async function (test) {
      var expectedErrorMsg = "Roles error: groups can not start with '$'"

      await resetAsync() 
      try {
        await Roles.addUsersToRolesAsync(users.joe, ['admin'], '$group1')
        throw new Error("expected exception but didn't get one")
      } 
      catch (ex) {
        test.isTrue(ex.message == expectedErrorMsg, ex.message)
      }

      await resetAsync() 
      // should not throw error
      await Roles.addUsersToRolesAsync(users.bob, ['editor', 'user'], 'g$roup1')
    })

  Tinytest.add(
    'roles - async - userIsInRole returns false for unknown roles',
    async function (test) {
      await resetAsync();

      await Roles.createRoleAsync('admin')
      await Roles.createRoleAsync('user')
      await Roles.createRoleAsync('editor')
      await Roles.addUsersToRolesAsync(users.eve, ['admin', 'user'])
      await Roles.addUsersToRolesAsync(users.eve, ['editor'])

      test.isFalse(await Roles.userIsInRoleAsync(users.eve, 'unknown'))
      test.isFalse(await Roles.userIsInRoleAsync(users.eve, []))
      test.isFalse(await Roles.userIsInRoleAsync(users.eve, null))
      test.isFalse(await Roles.userIsInRoleAsync(users.eve, undefined))

      test.isFalse(await Roles.userIsInRoleAsync(users.eve, ["Role1", "Role2", undefined]))
    });

  Tinytest.add(
    'roles - async - dot in role name in getGroupsForUser',
    async function (test) {
      await resetAsync();

      await Roles.createRoleAsync('users.view')
      await Roles.addUsersToRolesAsync(users.eve, 'users.view', 'b')
      test.equal(Roles.getGroupsForUser(users.eve, 'users.view'), ['b'])
    });


  function printException (ex) {
    var tmp = {}
    for (var key in ex) {
      if (key != 'stack') {
        tmp[key] = ex[key]
      }
    }
    console.log(JSON.stringify(tmp));
  }

}());
  