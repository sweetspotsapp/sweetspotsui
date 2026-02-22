import { Outlet, useMatch } from "react-router-dom";
import Index from "@/pages/Index";

/**
 * Layout that keeps the Index (tabs) component permanently mounted.
 * Child routes (place details, see-all) render on top via <Outlet />.
 */
const PersistentLayout = () => {
  // Check if we're on an overlay route (place details, see-all)
  const isPlaceDetail = useMatch("/place/:placeId");
  const isSeeAll = useMatch("/see-all");
  const hasOverlay = isPlaceDetail || isSeeAll;

  return (
    <>
      {/* Index always stays mounted; hidden when overlay is active */}
      <div style={{ display: hasOverlay ? "none" : "block" }}>
        <Index />
      </div>
      {/* Overlay pages render here */}
      <Outlet />
    </>
  );
};

export default PersistentLayout;
