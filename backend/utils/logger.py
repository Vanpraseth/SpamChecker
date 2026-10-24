import logging
import os

#creates useful logs for debugging
def get_logger(name: str = __name__) -> logging.Logger:
    
    #get a log from the environment 
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    
    #maps the log a numeric log level
    level = getattr(logging, level_name, logging.INFO)
    
    #gets log with requested name
    logger = logging.getLogger(name)
    
    #ensures that configurations happen once per logger
    if not logger.handlers:
        logger.setLevel(level)
        handler = logging.StreamHandler()
        fmt = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
        handler.setFormatter(logging.Formatter(fmt))
        logger.addHandler(handler)
        logger.propagate = False
    return logger