var Payload = require('../../../libraries/payloads/payload'),
expect = require('chai').expect,

TestPayload = Payload.extend({
  required_fields: ['required', 'required_but_empty'],
  field_vals: {
    required: ['foo']
  }
});

describe('Payload', function() {
  var instance;

  beforeEach(function(done) {
    instance = null;
    done();
  });

  describe('#init', function() {
    it('sets required fields to function', function() {
      instance = new Payload({});
      expect(instance.original_data).to.be.an('object');
      expect(instance.original_data).to.be.empty;
      expect(instance.data).to.be.an('object');
      expect(instance.data).to.be.empty;
      expect(instance.field_vals).to.be.an('object');
      expect(instance.field_vals).to.be.empty;
      expect(instance.required_fields).to.be.an('array');
      expect(instance.required_fields).to.be.empty;
      expect(instance.name).to.equal('payload');
    });

    it('parses & sets data correctly', function() {
      instance = new Payload('{"foo": "bar"}');
      expect(instance.data).to.deep.equal({foo: 'bar'});
    });

    it('throws when invalid JSON is given', function() {
      expect(function() {new Payload('{ something: bar');})
        .to.throw('content type must == "application/json"');
    });
  });

  describe('#setName', function() {
    it('does what it says', function() {
      instance = new Payload({});
      instance.setName('foo');
      expect(instance.name).to.equal('foo');
    });

    it('whines when a non-string is given', function() {
      instance = new Payload({});
      expect(function() { instance.setName(0); })
        .to.throw(/not string/);
    });

    it('returns "this"', function() {
      instance = new Payload();
      expect(instance.setName('foo')).to.equal(instance);
    });
  });

  describe('#appendData', function() {
    it('appends fields & values', function() {
      instance = new Payload({});
      expect(instance.appendData('foo', 'bar').data)
        .to.deep.equal({foo: 'bar'});
    });

    it('completely overwrites old field values', function() {
      instance = new Payload({foo: 'bar'});
      expect(instance.appendData('foo', 'baz').data)
        .to.deep.equal({foo: 'baz'});
    });

    it('returns "this"', function() {
      instance = new Payload();
      expect(instance.setName('foo')).to.equal(instance);
    });
  });

  describe('#payload', function() {
    it('can construct a default payload', function() {
      expect(new Payload().payload())
        .to.deep.equal({payload: {}});
    });
  });

  describe('#validate', function() {
    it('throws when a field is missing', function() {
      instance = new TestPayload();
      expect(function() { instance.validate(); })
        .to.throw(/missing field/);
    });

    it('throws when field val not in allowed vals', function() {
      instance = new TestPayload({required: 'bar'});
      expect(function() { instance.validate(); })
        .to.throw(/value for.*not in.*/);
    });

    it('allows empty fields', function() {
      instance = new TestPayload({
        required: 'foo',
        required_but_empty: null
      });
      expect(function() { instance.validate(); })
        .to.not.throw(/missing field/);
    });

    it('returns "this"', function() {
      instance = new Payload();
      expect(instance.setName('foo')).to.equal(instance);
    });
  });
});
