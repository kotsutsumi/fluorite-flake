/**
 * Web アプリのランディングページに関するユニットテスト。
 * レンダリングと主要コンテンツの表示を検証する。
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home Page", () => {
  describe("Page Rendering", () => {
    it("should render without crashing", () => {
      render(<Home />);
      // "Your Site" はヘッダー・フッターの双方に表示されるため複数件ヒットする
      expect(screen.getAllByText("Your Site").length).toBeGreaterThan(0);
    });

    it("should display main heading", () => {
      render(<Home />);
      expect(
        screen.getByText(/野心のスピードに合わせた変革をオーケストレーションします/i)
      ).toBeInTheDocument();
    });

    it("should display navigation links", () => {
      render(<Home />);
      // Nav links appear in header and footer, use getAllByText
      expect(screen.getAllByText("サービス").length).toBeGreaterThan(0);
      expect(screen.getAllByText("インサイト").length).toBeGreaterThan(0);
      expect(screen.getAllByText("私たちについて").length).toBeGreaterThan(0);
      expect(screen.getAllByText("お問い合わせ").length).toBeGreaterThan(0);
    });
  });

  describe("Services Section", () => {
    it("should display all service cards", () => {
      render(<Home />);
      expect(screen.getByText("コーポレート戦略")).toBeInTheDocument();
      expect(screen.getByText("データ＆オートメーション")).toBeInTheDocument();
      expect(screen.getByText("リスク＆コンプライアンス")).toBeInTheDocument();
      expect(screen.getByText("グローバル展開支援")).toBeInTheDocument();
    });

    it("should display service section header", () => {
      render(<Home />);
      expect(screen.getByText("事業インパクトを生む実証済みサービス")).toBeInTheDocument();
    });
  });

  describe("Statistics Section", () => {
    it("should display statistics", () => {
      render(<Home />);
      expect(screen.getByText("180+")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("94%")).toBeInTheDocument();
      expect(screen.getByText("350")).toBeInTheDocument();
    });

    it("should display statistics labels", () => {
      render(<Home />);
      expect(screen.getByText("変革プログラムの実績")).toBeInTheDocument();
      expect(screen.getByText("対応マーケット")).toBeInTheDocument();
      expect(screen.getByText("クライアント継続率")).toBeInTheDocument();
      expect(screen.getByText("専門コンサルタント")).toBeInTheDocument();
    });
  });

  describe("Contact Section", () => {
    it("should display contact information", () => {
      render(<Home />);
      expect(screen.getAllByText("hello@yoursite.com").length).toBeGreaterThan(0);
      expect(screen.getAllByText("+1 (312) 555-0149").length).toBeGreaterThan(0);
    });

    it("should display office locations", () => {
      render(<Home />);
      expect(screen.getAllByText(/Chicago/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/London/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Singapore/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/São Paulo/).length).toBeGreaterThan(0);
    });
  });

  describe("Leadership Section", () => {
    it("should display leadership team", () => {
      render(<Home />);
      expect(screen.getByText("Aiden Mercer")).toBeInTheDocument();
      expect(screen.getByText("Mira Okafor")).toBeInTheDocument();
      expect(screen.getByText("Jonas Meyer")).toBeInTheDocument();
    });

    it("should display leadership roles", () => {
      render(<Home />);
      expect(screen.getByText("Managing Partner")).toBeInTheDocument();
      expect(screen.getByText("Chief Innovation Officer")).toBeInTheDocument();
      expect(screen.getByText("Head of Global Delivery")).toBeInTheDocument();
    });
  });

  describe("Testimonials Section", () => {
    it("should display customer testimonials", () => {
      render(<Home />);
      expect(screen.getByText("Lina Ortega")).toBeInTheDocument();
      expect(screen.getByText("Rohit Patel")).toBeInTheDocument();
    });
  });

  describe("Footer", () => {
    it("should display footer with copyright", () => {
      render(<Home />);
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`© ${currentYear} Your Site`))).toBeInTheDocument();
    });

    it("should display footer links", () => {
      render(<Home />);
      expect(screen.getByText("プライバシー")).toBeInTheDocument();
      expect(screen.getByText("利用規約")).toBeInTheDocument();
      expect(screen.getByText("サステナビリティ")).toBeInTheDocument();
    });
  });
});

// EOF
