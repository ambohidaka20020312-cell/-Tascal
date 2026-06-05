import mixpanel from "mixpanel-browser";

let initialized = false;

const analytics = {
  init(token: string) {
    mixpanel.init(token, { persistence: "localStorage" });
    initialized = true;
  },

  identify(userId: string, props?: Record<string, unknown>) {
    if (!initialized) return;
    mixpanel.identify(userId);
    if (props) {
      mixpanel.people.set(props);
    }
  },

  track(event: string, props?: Record<string, unknown>) {
    if (!initialized) return;
    mixpanel.track(event, props);
  },

  reset() {
    if (!initialized) return;
    mixpanel.reset();
  },
};

export { analytics };
export default analytics;

