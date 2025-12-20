import { useState } from "react";
import EntryScreen from "@/components/EntryScreen";
import ResultsScreen from "@/components/ResultsScreen";
import LoadingTransition from "@/components/LoadingTransition";

type AppState = "entry" | "loading" | "results";

const vagueInputs = ["idk", "food", "chill", "something", "anything", "whatever", "dunno", "no idea"];

const Index = () => {
  const [appState, setAppState] = useState<AppState>("entry");
  const [currentMood, setCurrentMood] = useState("");
  const [isVague, setIsVague] = useState(false);

  const handleMoodSubmit = (mood: string) => {
    setCurrentMood(mood);
    setIsVague(vagueInputs.some(v => mood.toLowerCase().trim() === v));
    setAppState("loading");

    // Simulate loading
    setTimeout(() => {
      setAppState("results");
    }, 1500);
  };

  const handleBack = () => {
    setAppState("entry");
    setCurrentMood("");
    setIsVague(false);
  };

  return (
    <>
      {appState === "loading" && <LoadingTransition />}
      
      <div className={appState === "loading" ? "opacity-0" : "opacity-100 transition-opacity duration-300"}>
        {appState === "entry" && (
          <EntryScreen onSubmit={handleMoodSubmit} />
        )}
        
        {appState === "results" && (
          <ResultsScreen 
            mood={currentMood} 
            onBack={handleBack}
            isVague={isVague}
          />
        )}
      </div>
    </>
  );
};

export default Index;
