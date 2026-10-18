import { getPublishedPosts } from "../../lib/posts";
import DirListing from "../../components/DirListing";

export const metadata = { title: "writing" };

export default function AllPosts() {
  const rows = getPublishedPosts().map((post) => ({
    key: post.slug,
    date: post.date,
    name: `${post.slug}.md`,
    href: `/post/${post.slug}`,
    desc: post.description,
  }));

  return <DirListing dir="writing" rows={rows} empty="no posts yet." />;
}
