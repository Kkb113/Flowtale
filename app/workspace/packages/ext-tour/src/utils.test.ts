import {
  getCookieHeaderForUrl,
  getAbsoluteUrl,
  isMissingMessageReceiverError,
  isMissingTabError,
  isRecordableUrl
} from "./utils";

describe("utils", () => {
  describe("#isRecordableUrl", () => {
    it("allows regular and local web pages", () => {
      expect(isRecordableUrl("https://example.com/path")).toBe(true);
      expect(isRecordableUrl("http://localhost:3000/demos")).toBe(true);
    });

    it("rejects browser-owned and invalid URLs", () => {
      expect(isRecordableUrl("chrome://extensions")).toBe(false);
      expect(isRecordableUrl("chrome-extension://extension-id/popup.html")).toBe(false);
      expect(isRecordableUrl("about:blank")).toBe(false);
      expect(isRecordableUrl("not a url")).toBe(false);
    });
  });

  describe("#isMissingMessageReceiverError", () => {
    it("recognizes the expected no-listener rejection", () => {
      expect(isMissingMessageReceiverError(
        new Error("Could not establish connection. Receiving end does not exist.")
      )).toBe(true);
    });

    it("does not hide unrelated messaging failures", () => {
      expect(isMissingMessageReceiverError(new Error("Tab was closed"))).toBe(false);
    });
  });

  describe("#isMissingTabError", () => {
    it("recognizes Chrome's stale-tab rejection", () => {
      expect(isMissingTabError(new Error("No tab with id: 1697874638."))).toBe(true);
    });

    it("does not hide unrelated tab failures", () => {
      expect(isMissingTabError(new Error("Tabs cannot be edited right now"))).toBe(false);
    });
  });

  describe("#getCookieHeaderForUrl", () => {
    const allCookies: chrome.cookies.Cookie[] = [
      {
        domain: ".google.com",
        expirationDate: 1672995089,
        hostOnly: false,
        httpOnly: false,
        name: "__utma",
        path: "/forms/about/",
        sameSite: "unspecified",
        secure: false,
        session: false,
        storeId: "0",
        value: "ab",
      },
      {
        domain: ".google.com",
        expirationDate: 1673714247,
        hostOnly: false,
        httpOnly: false,
        name: "__utma",
        path: "/analytics/web",
        sameSite: "unspecified",
        secure: false,
        session: false,
        storeId: "0",
        value: "cd",
      },
      {
        domain: "analytics.google.com",
        expirationDate: 1669742982.760138,
        hostOnly: true,
        httpOnly: false,
        name: "GA_XSRF_TOKEN",
        path: "/analytics/",
        sameSite: "unspecified",
        secure: true,
        session: false,
        storeId: "0",
        value: "ef",
      },
      {
        domain: ".google.com",
        expirationDate: 1703393125.220652,
        hostOnly: false,
        httpOnly: true,
        name: "__Secure-1PSID",
        path: "/",
        sameSite: "unspecified",
        secure: true,
        session: false,
        storeId: "0",
        value: "gh",
      },
      {
        domain: "analytics.google.com",
        hostOnly: true,
        httpOnly: false,
        name: "S",
        path: "/",
        sameSite: "unspecified",
        secure: false,
        session: true,
        storeId: "0",
        value: "ij",
      },
      {
        domain: ".google.com",
        expirationDate: 1685517120.909061,
        hostOnly: false,
        httpOnly: true,
        name: "NID",
        path: "/",
        sameSite: "no_restriction",
        secure: true,
        session: false,
        storeId: "0",
        value: "kl",
      },
      {
        domain: ".google.com",
        expirationDate: 1672299671.72149,
        hostOnly: false,
        httpOnly: false,
        name: "1P_JAR",
        path: "/",
        sameSite: "no_restriction",
        secure: true,
        session: false,
        storeId: "0",
        value: "2022-11-29-07",
      },
    ];
    it("should extract create cookie header for correct domain", () => {
      const setCookieStr = getCookieHeaderForUrl(
        allCookies,
        new URL(
          "https://analytics.google.com/analytics/web/#/report-home/a175445601w243254508p226541679"
        )
      );

      const exp = [
        "1P_JAR=2022-11-29-07",
        "NID=kl",
        "S=ij",
        "__Secure-1PSID=gh",
        "GA_XSRF_TOKEN=ef",
        "__utma=cd",
      ];

      expect(
        setCookieStr
          .split(";")
          .map((_) => _.trim())
          .sort()
      ).toEqual(exp.sort());
    });
  });

  describe("#getAbsoluteUrl", () => {
    it("should return the same url if the url is already aboslute", () => {
      const absoluteUrl = getAbsoluteUrl(
        "https://acme.com/calendar/_/web/calendar-static/_/ss/k",
        "https://api.acme.com/"
      );

      expect(absoluteUrl).toEqual(
        "https://acme.com/calendar/_/web/calendar-static/_/ss/k"
      );
    });

    it("should return the absolute url if the url is already relative but starts from root", () => {
      const absoluteUrl = getAbsoluteUrl(
        "/calendar/_/web/calendar-static/_/ss/k",
        "https://api.acme.com/u/0/user/"
      );

      expect(absoluteUrl).toEqual(
        "https://api.acme.com/calendar/_/web/calendar-static/_/ss/k"
      );
    });

    it("should return the absolute url if the url is already relative", () => {
      const absoluteUrl = getAbsoluteUrl(
        "calendar/_/web/calendar-static/_/ss/k",
        "https://api.acme.com/u/0/user/"
      );

      expect(absoluteUrl).toEqual(
        "https://api.acme.com/u/0/user/calendar/_/web/calendar-static/_/ss/k"
      );
    });
  });
});
