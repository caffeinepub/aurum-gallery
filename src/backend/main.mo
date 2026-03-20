import Map "mo:core/Map";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";



actor {
  public type Moment = {
    id : Nat;
    title : Text;
    caption : Text;
    date : Text;
    imageId : Text;
    videoId : ?Text;
    audioId : ?Text;
    uploadedBy : Text;
    createdAt : Int;
    order : Nat;
  };

  module Moment {
    public func compareByCreatedAt(moment1 : Moment, moment2 : Moment) : Order.Order {
      Int.compare(moment2.createdAt, moment1.createdAt);
    };
  };

  public type UserProfile = {
    name : Text;
  };

  let moments = Map.empty<Nat, Moment>();
  var nextMomentId = 0;

  let userProfiles = Map.empty<Principal, UserProfile>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  include MixinStorage();

  public shared func createMoment(
    title : Text,
    caption : Text,
    date : Text,
    imageId : Text,
    uploadedBy : Text,
    videoId : ?Text,
    audioId : ?Text,
  ) : async Nat {
    let momentId = nextMomentId;
    let newMoment : Moment = {
      id = momentId;
      title;
      caption;
      date;
      imageId;
      videoId;
      audioId;
      uploadedBy;
      createdAt = Time.now();
      order = moments.size();
    };
    moments.add(momentId, newMoment);
    nextMomentId += 1;
    momentId;
  };

  public query func getMoment(id : Nat) : async ?Moment {
    moments.get(id);
  };

  public query func getAllMoments() : async [Moment] {
    moments.values().toArray().sort(Moment.compareByCreatedAt);
  };

  public shared func updateMoment(
    id : Nat,
    title : Text,
    caption : Text,
    date : Text,
    imageId : Text,
    videoId : ?Text,
    audioId : ?Text,
  ) : async () {
    switch (moments.get(id)) {
      case (null) { Runtime.trap("Moment not found"); };
      case (?existingMoment) {
        let updatedMoment : Moment = {
          id = existingMoment.id;
          title;
          caption;
          date;
          imageId;
          videoId;
          audioId;
          uploadedBy = existingMoment.uploadedBy;
          createdAt = existingMoment.createdAt;
          order = existingMoment.order;
        };
        moments.add(id, updatedMoment);
      };
    };
  };

  public shared func deleteMoment(id : Nat) : async () {
    switch (moments.get(id)) {
      case (null) { Runtime.trap("Moment not found"); };
      case (?_m) { moments.remove(id); };
    };
  };

  public query func getMomentCount() : async Nat {
    moments.size();
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    userProfiles.add(caller, profile);
  };
};
