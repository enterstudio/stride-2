var stride = require("../");

//nodeunit tests
exports.callsCallbacks = function(test) {
	test.expect(7);
	var x = 1;
	stride(
		function() {
			test.equal(x, 1);
			x = 2;
			this(null);
			test.equal(x, 5);
			test.done();
		},
		function() {
			test.equal(x, 2);
			x = 3;
			this(/* we allow `null` to be missing cuz we are cool */);
			test.equal(x, 4);
			x = 5;
			test.equal(x, 5);
		},
		function() {
			test.equal(x, 3);
			x = 4;
			this(/* we allow `null` to be missing cuz we are cool */);
			test.equal(x, 4);
		}
	);
};

exports.catchesErrors = function(test) {
	test.expect(7);
	var x = 1;
	stride(
		function() {
			test.equal(x, 1);
			x = 2;
			this();
			test.equal(x, 3);
		},
		function() {
			test.equal(x, 2);
			x = 3;
			throw new Error("This is an error.");
		},
		function() {
			test.ok(false); //should not get here
			test.equal(x, 3);
			x = 4;
			this();
			test.equal(x, 4);
		}
	).on("error", function(err) {
		test.equal(x, 3);
		x = "err";
		test.equal(err.toString(), "Error: This is an error.");
	}).on("done", function(err) {
		test.equal(x, "err");
		test.equal(err.message, "This is an error.");
		test.done();
	});
};

exports.handlesMultipleCallbackProblem = function(test) {
	test.expect(21);
	var x = 1;
	stride(
		function() {
			test.equal(x, 1);
			x++;
			this(null, "arg1", "arg2");
			test.equal(x, 4);
			this(null, "arg3", "arg4");
			test.equal(x, 4);
			this(null, "arg5", "arg6");
			test.equal(x, 4);
			this(null, "arg7", "arg8");
		},
		function(arg1, arg2) {
			// Only gets executed once
			test.equal(x, 2);
			x++;
			test.equal(arg1, "arg1");
			test.equal(arg2, "arg2");
			test.equal(2, arguments.length);
			this();
		},
		function() {
			// Only gets executed once
			test.equal(x, 3);
			x++;
			this(null, "foo", "bar");
		}
	).on("error", function(err) {
		// Gets called 3 times
		test.equal(1, arguments.length);
		test.ok(err.message.indexOf("called more than") >= 0);
		x++;
		if(x == 9)
			test.done();
	}).on("done", function(err, foo, bar) {
		// Gets called twice
		if(x == 4) {
			test.equal(3, arguments.length);
			test.equal(err, null);
			test.equal(foo, "foo");
			test.equal(bar, "bar");
			x++;
		}
		else if(x == 6) {
			test.equal(1, arguments.length);
			test.ok(err.message.indexOf("called more than") >= 0);
			x++;
		}
		else
			test.ok(false);
	});
};

exports.handlesMultipleCallbacks = function(test) {
	test.expect(26);
	var x = 1;
	stride(
		function() {
			this.canBeCalled(3);
			test.equal(x, 1);
			x++;
			this(null, "arg1", "arg2");
			test.equal(x, 4);
			this(null, "arg3", "arg4");
			test.equal(x, 6);
			this(null, "arg5", "arg6");
			test.equal(x, 8);
		},
		function(arg1, arg2) {
			if(x == 2) {
				test.equal(arg1, "arg1");
				test.equal(arg2, "arg2");
			} else if(x == 4) {
				test.equal(arg1, "arg3");
				test.equal(arg2, "arg4");
			} else {
				test.equal(x, 6);
				test.equal(arg1, "arg5");
				test.equal(arg2, "arg6");
			}
			x++;
			test.equal(2, arguments.length);
			this();
		},
		function() {
			x++;
			this(null, "foo", "bar");
		}
	).once("error", function(err) {
		test.ok(false);
		x = "err";
	}).on("done", function(err, foo, bar) {
		test.equal(3, arguments.length);
		test.equal(err, null);
		test.equal(foo, "foo");
		test.equal(bar, "bar");
		x++;
		if(x == 11)
			test.done();
	});
};

exports.notCompatibleWithStepSilliness = function(test) {
	test.expect(6);
	var x = 1;
	stride(
		function() {
			this.canBeCalled(2);
			setTimeout(this.bind(null, null, "timer1"), 100);
			setTimeout(this.bind(null, null, "timer2"), 200);
		},
		function(timer) {
			test.equals(timer, "timer" + x);
			x++;
			setTimeout(this.bind(null, null, "timer3"), 300);
		},
		function(timer) {
			test.equals(timer, "timer3");
			x++;
			this();
		}
	).on("done", function(err) {
		test.equals(arguments.length, 0);
		if(x == 5)
			test.done();
	});
};

exports.supportsParallelCallbacks = function(test) {
	test.expect(13);
	var x = 1;
	stride(
		function() {
			test.equal(x, 1);
			setTimeout(this.parallel().bind(null, null, "foo"), 100);
			setTimeout(this.parallel(), 300);
			setTimeout(this.parallel().bind(null, null, "foo", "bar"), 200);
			x = 2;
			var cb = this.parallel();
			setTimeout(function() {
				test.equal(x, 2);
				x = 3;
				cb(null, "idiot");
			}, 400);
		},
		function(arg1, arg2, arg3, arg4) {
			test.equal(x, 3);
			x = 4;
			test.equal(arg1, "foo");
			test.equal(arg2, undefined);
			test.equal(arg3, "foo");
			test.equal(arg4, "idiot");
			test.equal(4, arguments.length);
			this(null, arg1);
			test.equals(x, 4);
		}
	).on("error", function(err) {
		x = "err";
		test.ok(false); //should not get here
	}).on("done", function(err, arg1) {
		test.equals(x, 4);
		x = "done";
		test.equals(2, arguments.length);
		test.equals(err, null);
		test.equals(arg1, "foo");
		test.done();
	});
};

exports.supportsParallelCallbacksWithError = function(test) {
	test.expect(8);
	var x = 1;
	stride(
		function() {
			test.equal(x, 1);
			setTimeout(this.parallel().bind(null, null, "foo"), 100);
			setTimeout(this.parallel().bind(null, new Error("Oops!") ), 300);
			setTimeout(this.parallel().bind(null, null, "foo", "bar"), 200);
			x = 2;
			var cb = this.parallel();
			setTimeout(function() {
				test.equal(x, 2);
				x = 3;
				cb(null, "idiot");
			}, 400);
		},
		function(arg1, arg2, arg3, arg4) {
			test.ok(false); //should not get here
			this();
		}
	).on("error", function(err) {
		test.equals(x, 3);
		test.equals(arguments.length, 1);
		x = "err";
		test.equals(err.message, "Oops!");
	}).on("done", function(err, arg1, arg2, arg3, arg4) {
		test.equals(x, "err");
		x = "done";
		test.equals(arguments.length, 1);
		test.equals(err.message, "Oops!");
		test.done();
	});
};

exports.supportsErrorArgumentOnlyFalse = function(test) {
	test.expect(15);
	var x = 1;
	stride(
		function() {
			test.equals(this.errorArgumentOnly(), true);
			this.errorArgumentOnly(false);
			test.equals(this.errorArgumentOnly(), false);
			test.equals(x, 1);
			setTimeout(this.parallel().bind(null, null, "foo"), 100);
			setTimeout(this.parallel().bind(null, new Error("Oops!") ), 300);
			setTimeout(this.parallel().bind(null, new Error("Oopsie!") ), 350);
			setTimeout(this.parallel().bind(null, null, "foo", "bar"), 200);
			x = 2;
			var cb = this.parallel();
			setTimeout(function() {
				test.equal(x, 2);
				x = 3;
				cb(null, "idiot");
			}, 400);
		},
		function(arg1, arg2, arg3, arg4) {
			test.ok(false); //should not get here
			this();
		}
	).on("error", function(err) {
		test.equals(x, 3);
		test.equals(arguments.length, 1);
		x = "err";
		test.equals(err.message, "Oops!");
	}).on("done", function(err, arg1, arg2, arg3, arg4, arg5) {
		test.equals(x, "err");
		x = "done";
		test.equals(arguments.length, 6);
		test.equals(err.message, "Oops!");
		test.equals(arg1, "foo");
		test.equals(arg2, undefined);
		test.equals(arg3, undefined);
		test.equals(arg4, "foo");
		test.equals(arg5, "idiot");
		test.done();
	});
};

exports.errorArgumentOnlyAffectsCurrentStepOnly = function(test) {
	test.expect(7);
	stride(function() {
		test.equals(this.errorArgumentOnly(), true);
		this.errorArgumentOnly(false);
		test.equals(this.errorArgumentOnly(), false);
		var cb = this.parallel();
		setTimeout(cb.bind(null, null, "hello"), 200);
	}, function(hello) {
		test.equals(this.errorArgumentOnly(), true);
		test.equals(arguments.length, 1);
		test.equals(hello, "hello");
		setTimeout(this.parallel().bind(null, null, "foo"), 100);
		setTimeout(this.parallel().bind(null, new Error("Oops!") ), 300);
		setTimeout(this.parallel().bind(null, null, "foo", "bar"), 200);
	}).on("done", function(err) {
		test.equals(arguments.length, 1);
		test.equals(err.message, "Oops!");
		test.done();
	});
};

exports.supportsParallelCallbacksWithMultipleArgs = function(test) {
	test.expect(14);
	stride(function() {
		setTimeout(this.parallel().bind(null, null, 1, 2, 3), 100);
		setTimeout(this.parallel(2).bind(null, null, 4, 5, 6), 200);
		setTimeout(this.parallel(3).bind(null, null, 7, 8, 9), 150);
	}, function(a, b, c, d, e, f) {
		test.equals(arguments.length, 6);
		test.equals(a, 1);
		test.equals(b, 4);
		test.equals(c, 5);
		test.equals(d, 7);
		test.equals(e, 8);
		test.equals(f, 9);
		setTimeout(this.parallel(3).bind(null, null, 10, 11, 12), 100);
		setTimeout(this.parallel(2).bind(null, null, 13, 14, 15), 200);
	}).on("done", function(err, a, b, c, d, e) {
		test.equals(arguments.length, 6);
		test.equals(err, null);
		test.equals(a, 10);
		test.equals(b, 11);
		test.equals(c, 12);
		test.equals(d, 13);
		test.equals(e, 14);
		test.done();
	});
};

exports.handlesErrorWithoutErrorListener = function(test) {
	test.expect(2);
	stride(
		function() {
			this(new Error("Oops!") );
		}
	).on("done", function(err) {
		test.equals(arguments.length, 1);
		test.equals(err.message, "Oops!");
		test.done();
	});
};

exports.handlesErrorWithoutDoneListener = function(test) {
	test.expect(2);
	stride(
		function() {
			this(new Error("Oops!") );
		}
	).on("error", function(err) {
		test.equals(arguments.length, 1);
		test.equals(err.message, "Oops!");
		test.done();
	});
};

exports.canThrowUncaughtException = function(test) {
	test.expect(1);
	process.once("uncaughtException", function(err) {
		test.equal(err.message, "Uncaught exception within Stride: Oops!");
		test.done();
	});
	stride(
		function() {
			this(new Error("Oops!") );
		}
	);
};

exports.throwsErrorsInDoneHandler = function(test) {
	test.expect(1);
	process.once("uncaughtException", function(err) {
		test.equal(err.message, "Oops!");
		test.done();
	});
	stride(
		function() {
			this();
		}
	).once("done", function() {
		throw new Error("Oops!");
	});
};

exports.supportsGroups = function(test) {
	test.expect(5);
	var x = 1;
	stride(
		function() {
			var group = this.group();
			setTimeout(group().bind(null, null, "foo", "foo2"), 200);
			setTimeout(group().bind(null, null, "bar", "bar2"), 100);
		},
		function(data) {
			test.equals(arguments.length, 1);
			test.equals(data.length, 2);
			test.equals(data[0], "foo");
			test.equals(data[1], "bar");
			this();
		}
	).on("done", function(err) {
		test.equals(0, arguments.length);
		test.done();
	});
};

exports.supportsGroupsWithMultipleArguments = function(test) {
	test.expect(20);
	var x = 1;
	stride(
		function() {
			var group = this.group(2);
			setTimeout(group().bind(null, null, "foo", "foo2", "foo3"), 300);
			setTimeout(group().bind(null, null, "bar", "bar2"), 100);
			setTimeout(this.parallel().bind(null, null, "parallel", "parallel2"), 200);

			var group2 = this.group(4);
			setTimeout(group2().bind(null, null, "foo", "foo2", "foo3", "foo4", "foo5"), 300);
			setTimeout(group2().bind(null, null, "bar", "bar2", "bar3", "bar4", "bar5"), 100);
			setTimeout(this.parallel(3).bind(null, null, "world1", "world2", "world3", "world4"), 200);
		},
		function(data, parallel, data2, parallel2a, parallel2b, parallel2c) {
			test.equals(arguments.length, 6);
			test.equals(data.length, 4);
			test.equals(data[0], "foo");
			test.equals(data[1], "foo2");
			test.equals(data[2], "bar");
			test.equals(data[3], "bar2");
			test.equals(parallel, "parallel");
			test.equals(data2.length, 8);
			test.equals(data2[0], "foo");
			test.equals(data2[1], "foo2");
			test.equals(data2[2], "foo3");
			test.equals(data2[3], "foo4");
			test.equals(data2[4], "bar");
			test.equals(data2[5], "bar2");
			test.equals(data2[6], "bar3");
			test.equals(data2[7], "bar4");
			test.equals(parallel2a, "world1");
			test.equals(parallel2b, "world2");
			test.equals(parallel2c, "world3");
			this();
		}
	).on("done", function(err) {
		test.equals(0, arguments.length);
		test.done();
	});
};

exports.supportsGroupsWithErrors = function(test) {
	test.expect(3);
	var x = 1;
	stride(
		function() {
			var group = this.group();
			setTimeout(group().bind(null, new Error("This group throws an Error"),
				"foo", "foo2"), 200);
			setTimeout(group().bind(null, null, "bar", "bar2"), 100);
			x = 2;
		},
		function(data) {
			// Should not get executed
			x = 3;
			test.ok(false);
			this();
		}
	).on("done", function(err, data) {
		test.equals(x, 2);
		test.equals(arguments.length, 1);
		test.equals(err.message, "This group throws an Error");
		test.done();
	});
}

exports.worksSynchronously = function(test) {
	test.expect(16);
	var x = 1;
	stride(
		function() {
			test.equal(x, 1);
			x = 2;
			return "foo";
			//test.ok(false);
		},
		function(data) {
			test.equal(x, 2);
			test.equal(data, "foo");
			test.equal(arguments.length, 1);
			var p1 = this.parallel(),
				p2 = this.parallel();
			p1(null, "synchronous parallel");
			p2(null, "synchronous parallel 2");
			test.equal(x, 2);
			x = 3;
			setTimeout(function() {
				test.equal(x, 4);
				x = 5;
			}, 100);
		},
		function(p1, p2) {
			test.equal(arguments.length, 2);
			test.equal(x, 3);
			test.equal(p1, "synchronous parallel");
			test.equal(p2, "synchronous parallel 2");
			x = 4;
			setTimeout(this, 200);
		},
		function() {
			test.equal(arguments.length, 0);
			test.equal(x, 5);
			x = 6;
			return null;
		}
	).on("done", function(err, data) {
		test.equals(x, 6);
		test.equals(arguments.length, 2);
		test.equals(err, null);
		test.equals(data, null);
		test.done();
	});
};

exports.unusedGroupsDontCauseHangs = function(test) {
	test.expect(6);
	var x = 1;
	stride(function() {
		var g1 = this.group();
		var g2 = this.group();
		test.equals(x, 1);
		x++;
	}).on("done", function(err, g1, g2) {
		test.equals(x, 2);
		test.equals(arguments.length, 3);
		test.equals(err, null);
		test.equals(g1.length, 0);
		test.equals(g2.length, 0);
		test.done();
	});
};

exports.canStoreData = function(test) {
	test.expect(9);
	stride(
		function() {
			test.equal(this.data("foo"), undefined);
			this.data("foo", 1);
			test.equal(this.data("foo"), 1);
			return null;
		},
		function() {
			test.equal(this.data("foo"), 1);
			this.data("bar", "testing");
			this();
		},
		function() {
			test.equal(this.data("foo"), 1);
			test.equal(this.data("bar"), "testing");
			var data = this.data();
			test.equal(Object.keys(data).length, 2);
			test.equal(data.foo, 1);
			test.equal(data.bar, "testing");
			this();
		}
	).on("done", function(err) {
		test.equal(err, null);
		test.done();
	});
};

exports.worksWithNoArgs = function(test) {
	test.expect(3);
	var x = 1;
	stride().on("done", function(err) {
		test.equals(x, 1);
		test.equals(arguments.length, 0);
		test.equals(err, null);
		test.done();
	});
};

exports.executesEntireStepBeforeCallingNext = function(test) {
	function callsCallbackSynchronously(cb) {
		if(true) {
			return cb(null, "Hello");
		} else {
			// this branch does not execute
			test.ok(false);
			setTimeout(cb, 100);
		}
	}
	stride(function() {
		callsCallbackSynchronously(this.parallel() );
		/* Next step not called even though `this.parallel()` callback was
			called synchronously */
		setTimeout(this.parallel().bind(null, null, "World"), 100);
	}).once("done", function(err, data, data2) {
		test.equals(err, null);
		test.equals(data, "Hello");
		test.equals(data2, "World");
		test.equals(arguments.length, 3);
		test.done();
	});
};

exports.handlesSynchronousErrorAndParallelCallback = function(test) {
	test.expect(2);
	stride(function() {
		setTimeout(this.parallel().bind(null, null, "World"), 100);
		throw new Error("Oh no!!");
	}, function() {
		// Should never be reached
		test.ok(false);
	}).on("done", function(err) {
		test.equals(arguments.length, 1);
		test.equals(err.message, "Oh no!!");
		test.done();
	})
};
